"""
Comprehensive Chess Game Review Engine.
Analyzes games ply-by-ply, classifies move qualities (Brilliant, Best, Good,
Inaccuracy, Mistake, Blunder), computes player accuracy (0-100%), and generates
eval history for graphical review.
"""
import math
from typing import List, Dict, Any, Optional
import chess

from .evaluator import Evaluator
from .search import SearchEngine
from .openings import match_gambit_from_moves, get_gambit_by_id


def cp_to_win_pct(cp: float) -> float:
    """Converts centipawn score to expected win probability (0.0 to 100.0%)."""
    # Standard sigmoid model used in modern chess analytics
    clamped_cp = max(-1500.0, min(1500.0, cp))
    return 100.0 / (1.0 + math.pow(10.0, -clamped_cp / 400.0))


def win_pct_to_move_accuracy(win_pct_before: float, win_pct_after: float) -> float:
    """
    Computes accuracy percentage (0.0 to 100.0%) for a single move based on
    win percentage loss.
    """
    loss = max(0.0, win_pct_before - win_pct_after)
    # Smooth exponential decay
    acc = 103.1668 * math.exp(-0.04354 * loss) - 3.1668
    return max(0.0, min(100.0, acc))


class GameReviewer:
    def __init__(self, depth: int = 3):
        self.evaluator = Evaluator()
        self.search_engine = SearchEngine(self.evaluator)
        self.depth = depth

    def review_game(self, moves_uci: List[str], initial_fen: Optional[str] = None) -> Dict[str, Any]:
        """
        Performs full game review over an entire sequence of UCI moves.
        """
        board = chess.Board(initial_fen) if initial_fen else chess.Board()
        review_moves = []
        eval_history = []  # Eval in centipawns from White's perspective

        white_accuracies = []
        black_accuracies = []

        white_counts = {
            "brilliant": 0, "great": 0, "best": 0, "excellent": 0,
            "good": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0, "book": 0
        }
        black_counts = {
            "brilliant": 0, "great": 0, "best": 0, "excellent": 0,
            "good": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0, "book": 0
        }

        # Initial eval
        init_eval = self.evaluator.evaluate(board)
        eval_history.append(init_eval)

        played_moves_so_far: List[str] = []
        max_swing = 0.0
        turning_point_ply = -1

        for ply_idx, move_str in enumerate(moves_uci):
            turn = board.turn
            is_white = (turn == chess.WHITE)
            color_str = "white" if is_white else "black"
            move_num = (ply_idx // 2) + 1

            # 1. Search for engine's best move before player makes move
            best_move, best_score, _ = self.search_engine.find_best_move(board, depth=self.depth, max_time=0.4)
            best_uci = best_move.uci() if best_move else move_str
            best_san = board.san(best_move) if best_move else move_str

            # Eval before move from side-to-move perspective
            eval_before_side = best_score
            win_pct_before = cp_to_win_pct(eval_before_side)

            # 2. Check if played move is a legal move
            try:
                move_obj = chess.Move.from_uci(move_str)
            except Exception:
                break
            if move_obj not in board.legal_moves:
                break

            played_san = board.san(move_obj)
            played_moves_so_far.append(move_str)

            # 3. Check for book gambit move
            gambit_match = match_gambit_from_moves(played_moves_so_far)
            is_book_move = (gambit_match is not None and ply_idx < 12)

            # Check for piece sacrifice (for Brilliant move detection)
            is_sacrifice = False
            piece_moved = board.piece_at(move_obj.from_square)
            target_piece = board.piece_at(move_obj.to_square)
            piece_vals = {
                chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9
            }
            if piece_moved and piece_moved.piece_type in piece_vals:
                moved_val = piece_vals[piece_moved.piece_type]
                cap_val = piece_vals.get(target_piece.piece_type, 1 if target_piece else 0) if target_piece else 0
                # Check if moved piece lands on square attacked by opponent pawns/pieces
                opp_color = not is_white
                if len(board.attackers(opp_color, move_obj.to_square)) > 0 and moved_val > cap_val:
                    is_sacrifice = True

            # 4. Push move and evaluate resulting position
            board.push(move_obj)
            eval_after_white = self.evaluator.evaluate(board)
            eval_history.append(eval_after_white)

            # Eval after from the perspective of the player who just moved
            eval_after_side = eval_after_white if is_white else -eval_after_white
            win_pct_after = cp_to_win_pct(eval_after_side)

            # Compute delta
            delta_cp = max(0, eval_before_side - eval_after_side)
            delta_win = max(0.0, win_pct_before - win_pct_after)

            # Accuracy score
            accuracy = win_pct_to_move_accuracy(win_pct_before, win_pct_after)
            if is_white:
                white_accuracies.append(accuracy)
            else:
                black_accuracies.append(accuracy)

            # 5. Move Classification
            classification = "good"
            explanation = ""

            if is_book_move:
                classification = "book"
                gambit_name = gambit_match["name"]
                explanation = f"Book move: part of {gambit_name} opening theory."
            elif is_sacrifice and delta_cp <= 40 and eval_after_side >= -50:
                classification = "brilliant"
                explanation = f"Brilliant piece sacrifice! Active initiative and attacking pressure more than compensate."
            elif move_str == best_uci or delta_cp <= 15:
                classification = "best"
                explanation = "The best tactical continuation according to the engine."
            elif delta_cp <= 40:
                classification = "excellent"
                explanation = "A very strong and natural move."
            elif delta_cp <= 85:
                classification = "good"
                explanation = "A sound move keeping the game balanced."
            elif delta_cp <= 175:
                classification = "inaccuracy"
                explanation = f"Inaccuracy. Better was {best_san} ({best_uci}) to maintain pressure."
            elif delta_cp <= 350:
                classification = "mistake"
                explanation = f"Mistake. Concedes advantage. {best_san} was significantly stronger."
            else:
                classification = "blunder"
                explanation = f"Blunder! Major shift in evaluation. Best was {best_san}."

            # Track counts
            target_counts = white_counts if is_white else black_counts
            target_counts[classification] = target_counts.get(classification, 0) + 1

            # Check for largest game swing (turning point)
            swing = abs(delta_win)
            if swing > max_swing and classification in ["blunder", "mistake"]:
                max_swing = swing
                turning_point_ply = ply_idx

            review_moves.append({
                "ply": ply_idx,
                "move_number": move_num,
                "color": color_str,
                "uci": move_str,
                "san": played_san,
                "best_uci": best_uci,
                "best_san": best_san,
                "fen_after": board.fen(),
                "eval_white_cp": eval_after_white,
                "eval_white_pawns": round(eval_after_white / 100.0, 2),
                "delta_cp": round(delta_cp, 1),
                "accuracy": round(accuracy, 1),
                "classification": classification,
                "explanation": explanation
            })

        avg_white_acc = round(sum(white_accuracies) / max(1, len(white_accuracies)), 1) if white_accuracies else 100.0
        avg_black_acc = round(sum(black_accuracies) / max(1, len(black_accuracies)), 1) if black_accuracies else 100.0

        return {
            "summary": {
                "white_accuracy": avg_white_acc,
                "black_accuracy": avg_black_acc,
                "white_counts": white_counts,
                "black_counts": black_counts,
                "total_moves": len(review_moves),
                "turning_point_ply": turning_point_ply
            },
            "eval_history": eval_history,
            "moves": review_moves
        }
