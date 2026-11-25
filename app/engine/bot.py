"""
Chess Bot Implementation with Personality Presets & Gambit Book Integration.
"""
from typing import Optional, Tuple, Dict, Any, List
import chess
from .evaluator import Evaluator, EvalWeights
from .search import SearchEngine
from .openings import GAMBITS, find_gambit_continuation_with_name, get_gambit_by_id

BOT_PERSONALITIES: Dict[str, Dict[str, Any]] = {
    "tal": {
        "id": "tal",
        "name": "Mikhail Tal (The Magician)",
        "avatar": "🧙‍♂️",
        "description": "Hyper-aggressive, sacrifices material for king attacks, open diagonals, and chaotic complications.",
        "preferred_gambits": ["kings_gambit", "danish_gambit", "halloween_gambit", "latvian_gambit"],
        "default_depth": 4,
        "weights": EvalWeights(
            name="Mikhail Tal",
            pawn_val=90.0,            # Values pawns less, sacrifices them readily
            knight_val=330.0,
            bishop_val=345.0,
            rook_val=490.0,
            queen_val=920.0,
            mobility_weight=14.0,     # Huge value on open lines
            center_control_weight=18.0,
            king_attack_weight=38.0,  # Devastating king attack bonus
            development_weight=22.0,
            open_file_weight=20.0,
            bishop_pair_weight=50.0,
            gambit_aggression=2.4     # 240% tactical aggression
        )
    },
    "morphy": {
        "id": "morphy",
        "name": "Paul Morphy (The Romantic)",
        "avatar": "⚔️",
        "description": "Rapid development, open files, classical piece harmony, and relentless central tempo.",
        "preferred_gambits": ["evans_gambit", "kings_gambit", "scotch_gambit"],
        "default_depth": 4,
        "weights": EvalWeights(
            name="Paul Morphy",
            pawn_val=95.0,
            knight_val=320.0,
            bishop_val=335.0,
            rook_val=510.0,
            queen_val=900.0,
            mobility_weight=11.0,
            center_control_weight=22.0,
            king_attack_weight=28.0,
            development_weight=32.0,  # Prioritizes getting all pieces active immediately
            open_file_weight=25.0,
            bishop_pair_weight=45.0,
            gambit_aggression=2.0
        )
    },
    "kasparov": {
        "id": "kasparov",
        "name": "Garry Kasparov (The Boss)",
        "avatar": "👑",
        "description": "Deep dynamic calculation, crushing central initiative, and suffocating pressure.",
        "preferred_gambits": ["queens_gambit", "evans_gambit", "smith_morra", "benko_gambit"],
        "default_depth": 4,
        "weights": EvalWeights(
            name="Garry Kasparov",
            pawn_val=100.0,
            knight_val=325.0,
            bishop_val=335.0,
            rook_val=505.0,
            queen_val=915.0,
            mobility_weight=10.0,
            center_control_weight=24.0,
            king_attack_weight=26.0,
            development_weight=20.0,
            open_file_weight=18.0,
            bishop_pair_weight=42.0,
            gambit_aggression=1.7
        )
    },
    "rosen_trap": {
        "id": "rosen_trap",
        "name": "The Trap Master (Stafford Specialist)",
        "avatar": "🎯",
        "description": "Loves sneaky counter-gambits, poisoned pawns, and sudden checkmating ambushes.",
        "preferred_gambits": ["stafford_gambit", "englund_gambit", "budapest_gambit", "albin_countergambit"],
        "default_depth": 4,
        "weights": EvalWeights(
            name="Trap Master",
            pawn_val=85.0,            # Happy to be 1 or 2 pawns down for a trap
            knight_val=330.0,
            bishop_val=340.0,
            rook_val=495.0,
            queen_val=930.0,
            mobility_weight=15.0,
            center_control_weight=16.0,
            king_attack_weight=35.0,
            development_weight=24.0,
            open_file_weight=18.0,
            bishop_pair_weight=45.0,
            gambit_aggression=2.2
        )
    },
    "trained": {
        "id": "trained",
        "name": "Custom Trained AI Bot",
        "avatar": "🤖",
        "description": "Trained by reinforcement learning and master games to master aggressive gambit play.",
        "preferred_gambits": [],
        "default_depth": 4,
        "weights": EvalWeights(name="Trained Bot")
    }
}


class ChessBot:
    def __init__(self, personality_id: str = "tal", custom_weights: Optional[EvalWeights] = None):
        self.personality_id = personality_id
        personality = BOT_PERSONALITIES.get(personality_id, BOT_PERSONALITIES["tal"])
        self.personality = personality
        self.name = personality["name"]
        self.avatar = personality["avatar"]

        weights = custom_weights or personality["weights"]
        self.evaluator = Evaluator(weights)
        self.search_engine = SearchEngine(self.evaluator)
        self.preferred_gambit_id: Optional[str] = None
        if personality.get("preferred_gambits"):
            self.preferred_gambit_id = personality["preferred_gambits"][0]

    def set_personality(self, personality_id: str, custom_weights: Optional[EvalWeights] = None):
        if personality_id in BOT_PERSONALITIES:
            self.personality_id = personality_id
            self.personality = BOT_PERSONALITIES[personality_id]
            self.name = self.personality["name"]
            self.avatar = self.personality["avatar"]
            weights = custom_weights or self.personality["weights"]
            self.evaluator.update_weights(weights)
            if self.personality.get("preferred_gambits"):
                self.preferred_gambit_id = self.personality["preferred_gambits"][0]

    def set_preferred_gambit(self, gambit_id: Optional[str]):
        self.preferred_gambit_id = gambit_id

    def update_weights(self, weights: EvalWeights):
        self.evaluator.update_weights(weights)

    def choose_move(
        self,
        board: chess.Board,
        depth: int = 4,
        max_time: float = 1.0,
        move_history: Optional[List[str]] = None
    ) -> Tuple[Optional[chess.Move], Dict[str, Any]]:
        """
        Chooses the best move for the bot:
        1. Checks opening book for gambit continuations
        2. Falls back to Alpha-Beta search with personality evaluator
        """
        # Collect move history in UCI (prefer explicit history when board was constructed from FEN)
        if move_history is not None:
            move_history_uci = list(move_history)
        else:
            move_history_uci = [m.uci() for m in board.move_stack]

        # 1. Opening book check
        book_move_uci, matched_gambit_name = find_gambit_continuation_with_name(
            move_history_uci, self.preferred_gambit_id
        )
        if book_move_uci:
            try:
                book_move = chess.Move.from_uci(book_move_uci)
                if book_move in board.legal_moves:
                    # Found valid book move
                    current_gambit = get_gambit_by_id(self.preferred_gambit_id) if self.preferred_gambit_id else None
                    gambit_name = (current_gambit["name"] if current_gambit else None) or matched_gambit_name or "Book Gambit"
                    white_eval = self.evaluator.evaluate(board)
                    side_eval = white_eval if board.turn == chess.WHITE else -white_eval
                    return book_move, {
                        "is_book": True,
                        "gambit_name": gambit_name,
                        "comment": f"Playing {gambit_name} book line!",
                        "eval_cp": side_eval,
                        "nodes": 1,
                        "depth": 0,
                        "time": 0.001
                    }
            except Exception:
                pass

        # 2. Search Engine Calculation
        best_move, score, stats = self.search_engine.find_best_move(board, depth=depth, max_time=max_time)
        stats["is_book"] = False
        stats["eval_cp"] = score
        return best_move, stats
