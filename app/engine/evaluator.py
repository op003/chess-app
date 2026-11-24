"""
Dynamic & Gambit-Tuned Evaluation Function for Chess Engine.
Features tunable weights that value piece activity, rapid development,
center dominance, and king attack pressure over pure material count.
"""
from dataclasses import dataclass, asdict
from typing import Dict, Any, List
import json
import chess

# Standard Piece-Square Tables (Midgame) from White's perspective
PAWN_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
]

KNIGHT_TABLE = [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50,
]

BISHOP_TABLE = [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5, 10, 10,  5,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20,
]

ROOK_TABLE = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
]

QUEEN_TABLE = [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20
]

KING_MIDGAME_TABLE = [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
]


@dataclass
class EvalWeights:
    """Tunable evaluation weights for the bot."""
    name: str = "Gambit Attacker"
    pawn_val: float = 100.0
    knight_val: float = 315.0
    bishop_val: float = 330.0
    rook_val: float = 500.0
    queen_val: float = 900.0

    # Dynamic tactical and gambit weights
    pst_weight: float = 1.0
    mobility_weight: float = 8.0          # High mobility rewards open files & active pieces
    center_control_weight: float = 15.0   # Dominating e4, d4, e5, d5
    king_attack_weight: float = 24.0      # Weight for aiming attacks near enemy king
    development_weight: float = 18.0      # Knights & bishops off home rank
    open_file_weight: float = 16.0        # Rooks on open and half-open files
    bishop_pair_weight: float = 40.0      # Having both bishops
    passed_pawn_weight: float = 25.0      # Advanced pawns
    pawn_structure_weight: float = -12.0  # Penalty for doubled / isolated pawns
    gambit_aggression: float = 1.8        # Multiplier that rewards dynamic pressure over pawn count

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EvalWeights":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def save(self, filepath: str) -> None:
        with open(filepath, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "EvalWeights":
        with open(filepath, "r") as f:
            return cls.from_dict(json.load(f))


class Evaluator:
    """
    Evaluates a chess position using modern heuristics tuned for aggressive gambit play.
    """
    def __init__(self, weights: EvalWeights = None):
        self.weights = weights or EvalWeights()

    def update_weights(self, weights: EvalWeights) -> None:
        self.weights = weights

    def evaluate(self, board: chess.Board) -> int:
        """
        Evaluate board in centipawns from White's perspective.
        Positive = White is better, Negative = Black is better.
        """
        # Terminal condition check
        if board.is_checkmate():
            # If side to move is checkmated, the opponent won
            return -20000 if board.turn == chess.WHITE else 20000
        if board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
            return 0

        score = 0.0
        w = self.weights

        # 1. Material & Piece-Square Evaluation
        piece_values = {
            chess.PAWN: w.pawn_val,
            chess.KNIGHT: w.knight_val,
            chess.BISHOP: w.bishop_val,
            chess.ROOK: w.rook_val,
            chess.QUEEN: w.queen_val,
        }

        tables = {
            chess.PAWN: PAWN_TABLE,
            chess.KNIGHT: KNIGHT_TABLE,
            chess.BISHOP: BISHOP_TABLE,
            chess.ROOK: ROOK_TABLE,
            chess.QUEEN: QUEEN_TABLE,
            chess.KING: KING_MIDGAME_TABLE,
        }

        white_material = 0.0
        black_material = 0.0

        for piece_type, base_val in piece_values.items():
            for sq in board.pieces(piece_type, chess.WHITE):
                white_material += base_val
                sq_idx = chess.square_mirror(sq) if False else (63 - sq)
                score += base_val + (tables[piece_type][sq_idx] * w.pst_weight)

            for sq in board.pieces(piece_type, chess.BLACK):
                black_material += base_val
                sq_idx = sq
                score -= base_val + (tables[piece_type][sq_idx] * w.pst_weight)

        # King PST
        for sq in board.pieces(chess.KING, chess.WHITE):
            score += tables[chess.KING][63 - sq] * w.pst_weight
        for sq in board.pieces(chess.KING, chess.BLACK):
            score -= tables[chess.KING][sq] * w.pst_weight

        # 2. Bishop Pair Bonus
        if len(board.pieces(chess.BISHOP, chess.WHITE)) >= 2:
            score += w.bishop_pair_weight
        if len(board.pieces(chess.BISHOP, chess.BLACK)) >= 2:
            score -= w.bishop_pair_weight

        # 3. Development Bonus (Early Game)
        # Knights and bishops moved off back rank
        white_developed = 0
        for sq in [chess.B1, chess.G1, chess.C1, chess.F1]:
            piece = board.piece_at(sq)
            if piece is None or piece.color != chess.WHITE:
                white_developed += 1
        black_developed = 0
        for sq in [chess.B8, chess.G8, chess.C8, chess.F8]:
            piece = board.piece_at(sq)
            if piece is None or piece.color != chess.BLACK:
                black_developed += 1

        score += (white_developed - black_developed) * w.development_weight

        # 4. Center Control (e4, d4, e5, d5 and c4, f4, c5, f5)
        core_center = [chess.E4, chess.D4, chess.E5, chess.D5]
        outer_center = [chess.C4, chess.F4, chess.C5, chess.F5]

        white_center = sum(len(board.attackers(chess.WHITE, sq)) for sq in core_center) * 2 + \
                       sum(len(board.attackers(chess.WHITE, sq)) for sq in outer_center)
        black_center = sum(len(board.attackers(chess.BLACK, sq)) for sq in core_center) * 2 + \
                       sum(len(board.attackers(chess.BLACK, sq)) for sq in outer_center)

        score += (white_center - black_center) * w.center_control_weight

        # 5. King Attack Pressure (Attacking ring around enemy king)
        w_king_sq = board.king(chess.WHITE)
        b_king_sq = board.king(chess.BLACK)

        if b_king_sq is not None:
            # Squares surrounding Black king
            b_king_ring = chess.SquareSet(chess.BB_KING_ATTACKS[b_king_sq])
            white_attack_pressure = 0
            for ring_sq in b_king_ring:
                white_attack_pressure += len(board.attackers(chess.WHITE, ring_sq))
            score += white_attack_pressure * w.king_attack_weight * w.gambit_aggression

        if w_king_sq is not None:
            w_king_ring = chess.SquareSet(chess.BB_KING_ATTACKS[w_king_sq])
            black_attack_pressure = 0
            for ring_sq in w_king_ring:
                black_attack_pressure += len(board.attackers(chess.BLACK, ring_sq))
            score -= black_attack_pressure * w.king_attack_weight * w.gambit_aggression

        # 6. Open Files for Rooks
        for sq in board.pieces(chess.ROOK, chess.WHITE):
            file_idx = chess.square_file(sq)
            # Check if file has no pawns or only enemy pawns
            file_mask = chess.BB_FILES[file_idx]
            white_pawns_on_file = len(board.pieces(chess.PAWN, chess.WHITE) & chess.SquareSet(file_mask))
            black_pawns_on_file = len(board.pieces(chess.PAWN, chess.BLACK) & chess.SquareSet(file_mask))
            if white_pawns_on_file == 0:
                score += w.open_file_weight * (1.5 if black_pawns_on_file == 0 else 1.0)

        for sq in board.pieces(chess.ROOK, chess.BLACK):
            file_idx = chess.square_file(sq)
            file_mask = chess.BB_FILES[file_idx]
            white_pawns_on_file = len(board.pieces(chess.PAWN, chess.WHITE) & chess.SquareSet(file_mask))
            black_pawns_on_file = len(board.pieces(chess.PAWN, chess.BLACK) & chess.SquareSet(file_mask))
            if black_pawns_on_file == 0:
                score -= w.open_file_weight * (1.5 if white_pawns_on_file == 0 else 1.0)

        # 7. Mobility (Estimated by pseudo-legal attack count for efficiency)
        white_attacks = 0
        black_attacks = 0
        for sq, piece in board.piece_map().items():
            if piece.piece_type in [chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]:
                attacks = len(board.attacks(sq))
                if piece.color == chess.WHITE:
                    white_attacks += attacks
                else:
                    black_attacks += attacks

        score += (white_attacks - black_attacks) * w.mobility_weight

        # 8. Pawn Structure (Doubled Pawns)
        for file_idx in range(8):
            file_mask = chess.BB_FILES[file_idx]
            w_count = len(board.pieces(chess.PAWN, chess.WHITE) & chess.SquareSet(file_mask))
            b_count = len(board.pieces(chess.PAWN, chess.BLACK) & chess.SquareSet(file_mask))
            if w_count > 1:
                score += (w_count - 1) * w.pawn_structure_weight
            if b_count > 1:
                score -= (b_count - 1) * w.pawn_structure_weight

        return int(score)
