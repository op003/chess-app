"""
FastAPI Server for Chess Gambit Game & AI Bot Training.
"""
import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import chess

from app.engine.openings import GAMBITS, get_gambit_by_id
from app.engine.bot import ChessBot, BOT_PERSONALITIES
from app.engine.evaluator import Evaluator, EvalWeights
from app.engine.trainer import BotTrainer

app = FastAPI(title="Gambit Master Chess & AI Training Lab")

TRAINED_WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "..", "weights", "trained_bot.json")

# In-memory bot instances per personality
bot_instances: Dict[str, ChessBot] = {}

def get_or_create_bot(personality_id: str = "tal") -> ChessBot:
    if personality_id not in bot_instances:
        custom_weights = None
        if personality_id == "trained" and os.path.exists(TRAINED_WEIGHTS_PATH):
            try:
                custom_weights = EvalWeights.load(TRAINED_WEIGHTS_PATH)
            except Exception:
                pass
        bot_instances[personality_id] = ChessBot(personality_id, custom_weights=custom_weights)
    return bot_instances[personality_id]


class MoveRequest(BaseModel):
    fen: str
    moves: List[str] = []
    personality: str = "tal"
    preferred_gambit: Optional[str] = None
    depth: int = 4
    custom_weights: Optional[Dict[str, Any]] = None


class EvalRequest(BaseModel):
    fen: str
    personality: str = "tal"


class WeightsUpdateRequest(BaseModel):
    weights: Dict[str, Any]


# ==================== API ENDPOINTS ====================

@app.get("/api/gambits")
def get_all_gambits():
    """Returns list and details of all top gambits."""
    return {"gambits": list(GAMBITS.values())}


@app.get("/api/gambits/{gambit_id}")
def get_single_gambit(gambit_id: str):
    gambit = get_gambit_by_id(gambit_id)
    if not gambit:
        raise HTTPException(status_code=404, detail="Gambit not found")
    return gambit


@app.get("/api/personalities")
def get_personalities():
    """Returns list of bot personalities with their descriptions and traits."""
    result = []
    for pid, p in BOT_PERSONALITIES.items():
        result.append({
            "id": p["id"],
            "name": p["name"],
            "avatar": p["avatar"],
            "description": p["description"],
            "preferred_gambits": p["preferred_gambits"],
            "default_depth": p["default_depth"],
            "weights": p["weights"].to_dict()
        })
    return {"personalities": result}


@app.post("/api/bot/move")
def request_bot_move(req: MoveRequest):
    """
    Computes the bot's response move using opening gambit book or personality engine.
    """
    try:
        board = chess.Board(req.fen)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {e}")

    if board.is_game_over():
        raise HTTPException(status_code=400, detail="Game is already over")

    bot = get_or_create_bot(req.personality)
    bot.set_preferred_gambit(req.preferred_gambit)

    if req.custom_weights:
        try:
            bot.update_weights(EvalWeights.from_dict(req.custom_weights))
        except Exception:
            pass

    best_move, stats = bot.choose_move(board, depth=min(6, max(1, req.depth)), max_time=1.2)

    if not best_move or best_move not in board.legal_moves:
        # Fallback to any legal move
        legal = list(board.legal_moves)
        if not legal:
            raise HTTPException(status_code=400, detail="No legal moves available")
        best_move = legal[0]

    san_move = board.san(best_move)
    board.push(best_move)

    # Dynamic commentary generator based on personality & gambit
    comment = stats.get("comment", "")
    if not comment:
        eval_score = stats.get("eval_cp", 0)
        p_name = bot.name.split()[0]
        if stats.get("is_book"):
            comment = f"Playing known {stats.get('gambit_name', 'gambit')} theory!"
        elif eval_score > 200:
            comment = f"{p_name}: 'My pieces are swarming your position. Feel the attack!'"
        elif eval_score < -200:
            comment = f"{p_name}: 'A worthy counterattack, but the battle is far from over!'"
        else:
            comment = f"{p_name}: 'Active play and piece pressure will decide this!'"

    return {
        "move": best_move.uci(),
        "san": san_move,
        "fen_after": board.fen(),
        "is_book": stats.get("is_book", False),
        "gambit_name": stats.get("gambit_name"),
        "eval_cp": stats.get("eval_cp", 0),
        "nodes": stats.get("nodes", 0),
        "depth": stats.get("depth", req.depth),
        "time": stats.get("time", 0.0),
        "comment": comment
    }


@app.post("/api/evaluate")
def evaluate_position(req: EvalRequest):
    """Evaluates the position and returns detailed breakdown."""
    try:
        board = chess.Board(req.fen)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {e}")

    bot = get_or_create_bot(req.personality)
    score_cp = bot.evaluator.evaluate(board)

    # Material count
    white_mat = sum(len(board.pieces(pt, chess.WHITE)) * val for pt, val in [
        (chess.PAWN, 1), (chess.KNIGHT, 3), (chess.BISHOP, 3), (chess.ROOK, 5), (chess.QUEEN, 9)
    ])
    black_mat = sum(len(board.pieces(pt, chess.BLACK)) * val for pt, val in [
        (chess.PAWN, 1), (chess.KNIGHT, 3), (chess.BISHOP, 3), (chess.ROOK, 5), (chess.QUEEN, 9)
    ])

    return {
        "eval_cp": score_cp,
        "eval_pawns": round(score_cp / 100.0, 2),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "is_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "material_diff": white_mat - black_mat,
        "white_material": white_mat,
        "black_material": black_mat
    }


@app.get("/api/weights/trained")
def get_trained_weights():
    if os.path.exists(TRAINED_WEIGHTS_PATH):
        try:
            return EvalWeights.load(TRAINED_WEIGHTS_PATH).to_dict()
        except Exception:
            pass
    return EvalWeights(name="Default Trained Bot").to_dict()


@app.post("/api/weights/trained")
def save_trained_weights(req: WeightsUpdateRequest):
    try:
        weights = EvalWeights.from_dict(req.weights)
        weights.save(TRAINED_WEIGHTS_PATH)
        # Update in-memory trained bot
        if "trained" in bot_instances:
            bot_instances["trained"].update_weights(weights)
        return {"status": "success", "weights": weights.to_dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save weights: {e}")


# ==================== WEBSOCKET TRAINING LAB ====================

@app.websocket("/ws/train")
async def websocket_training(websocket: WebSocket):
    """
    Interactive real-time AI training channel:
    Streams generations, game results, weight evolutions, and board plies.
    """
    await websocket.accept()
    trainer = BotTrainer(output_path=TRAINED_WEIGHTS_PATH)

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action")

            if action == "start":
                generations = int(msg.get("generations", 3))
                depth = int(msg.get("depth", 2))
                base_personality = msg.get("personality", "tal")

                base_weights = BOT_PERSONALITIES.get(base_personality, BOT_PERSONALITIES["tal"])["weights"]

                await websocket.send_json({
                    "type": "started",
                    "generations": generations,
                    "depth": depth,
                    "message": "AI Training Lab started! Optimizing gambit evaluation weights..."
                })

                loop = asyncio.get_event_loop()

                def send_progress_sync(stats):
                    # Schedule coroutine in main loop
                    asyncio.run_coroutine_threadsafe(
                        websocket.send_json({"type": "progress", "data": stats}),
                        loop
                    )

                # Run training in background thread
                best_weights = await asyncio.to_thread(
                    trainer.train_evolutionary,
                    generations=generations,
                    search_depth=depth,
                    initial_weights=base_weights,
                    progress_callback=send_progress_sync
                )

                # Update in-memory trained bot instance
                if "trained" in bot_instances:
                    bot_instances["trained"].update_weights(best_weights)

                await websocket.send_json({
                    "type": "finished",
                    "message": "Training finished successfully!",
                    "weights": best_weights.to_dict()
                })

            elif action == "stop":
                trainer.stop_training()
                await websocket.send_json({"type": "stopped", "message": "Training stopped by user."})

    except WebSocketDisconnect:
        trainer.stop_training()
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


# Static files mount
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"message": "Chess Server Running. Static UI not found."})
