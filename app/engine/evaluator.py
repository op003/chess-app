"""
Dynamic & Gambit-Tuned Evaluation Function for Chess Engine.
Features tunable weights that value piece activity, rapid development,
center dominance, and king attack pressure over pure material count.
"""
from dataclasses import dataclass, asdict
from typing import Dict, Any, List
import json
import os
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

# Endgame: the king becomes a fighting piece — centralization is good
KING_ENDGAME_TABLE = [
   -50,-40,-30,-20,-20,-30,-40,-50,
   -30,-20,-10,  0,  0,-10,-20,-30,
   -20,-10, 20, 30, 30, 20,-10,-20,
   -10,  0, 30, 40, 40, 30,  0,-10,
   -10,  0, 30, 40, 40, 30,  0,-10,
   -20,-10, 20, 30, 30, 20,-10,-20,
   -30,-20,-10,  0,  0,-10,-20,-30,
   -50,-30,-30,-30,-30,-30,-30,-50,
]

# Total non-pawn material (both sides) at the start of a game — used for phase
MAX_PHASE_NPM = 2 * (2 * 315 + 2 * 330 + 2 * 500 + 900)


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
    king_safety_weight: float = 18.0      # Penalty for a naked king (missing pawn shield) — careful play
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
        parent = os.path.dirname(os.path.abspath(filepath))
        if parent:
            os.makedirs(parent, exist_ok=True)
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
        white_npm = 0.0
        black_npm = 0.0

        for piece_type, base_val in piece_values.items():
            for sq in board.pieces(piece_type, chess.WHITE):
                white_material += base_val
                if piece_type != chess.PAWN:
                    white_npm += base_val
                sq_idx = 63 - sq  # Mirror: a1=63 (back rank, low bonus), a8=7 (promo rank, high bonus)
                score += base_val + (tables[piece_type][sq_idx] * w.pst_weight)

            for sq in board.pieces(piece_type, chess.BLACK):
                black_material += base_val
                if piece_type != chess.PAWN:
                    black_npm += base_val
                sq_idx = sq
                score -= base_val + (tables[piece_type][sq_idx] * w.pst_weight)

        # Game phase: 1.0 = opening/full material, -> 0.0 = bare endgame
        phase = min(1.0, (white_npm + black_npm) / MAX_PHASE_NPM)

        # King PST: interpolate midgame (safety corner) -> endgame (active center)
        for sq in board.pieces(chess.KING, chess.WHITE):
            mid = tables[chess.KING][63 - sq]
            end = KING_ENDGAME_TABLE[63 - sq]
            score += (mid * phase + end * (1.0 - phase)) * w.pst_weight
        for sq in board.pieces(chess.KING, chess.BLACK):
            mid = tables[chess.KING][sq]
            end = KING_ENDGAME_TABLE[sq]
            score -= (mid * phase + end * (1.0 - phase)) * w.pst_weight

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
            # Attacks matter less as material leaves the board (endgame fade)
            score += white_attack_pressure * w.king_attack_weight * w.gambit_aggression * min(1.0, phase * 1.5)

        if w_king_sq is not None:
            w_king_ring = chess.SquareSet(chess.BB_KING_ATTACKS[w_king_sq])
            black_attack_pressure = 0
            for ring_sq in w_king_ring:
                black_attack_pressure += len(board.attackers(chess.BLACK, ring_sq))
            score -= black_attack_pressure * w.king_attack_weight * w.gambit_aggression * min(1.0, phase * 1.5)

        # Mop-up: when decisively ahead in a bare endgame, drive the defending
        # king to the edge and bring our own king closer (converts material to mate).
        if phase < 0.25:
            npm_lead = white_npm - black_npm
            if abs(npm_lead) >= 400 and w_king_sq is not None and b_king_sq is not None:
                def edge_dist(sq):
                    return max(abs(chess.square_file(sq) - 4.5), abs(chess.square_rank(sq) - 4.5))
                kings_dist = chess.square_distance(w_king_sq, b_king_sq)
                cornering = edge_dist(b_king_sq if npm_lead > 0 else w_king_sq) * 8 + (7 - kings_dist) * 6
                score += cornering if npm_lead > 0 else -cornering

        # 5b. King Safety — missing pawn shield in front of the king ("careful play" term)
        king_safety = w.king_safety_weight
        if king_safety:
            shield_phase = min(1.0, phase * 1.3)  # fades out in bare endgames
            for color, king_sq in ((chess.WHITE, w_king_sq), (chess.BLACK, b_king_sq)):
                if king_sq is None:
                    continue
                k_file = chess.square_file(king_sq)
                k_rank = chess.square_rank(king_sq)
                step = 1 if color == chess.WHITE else -1
                shield_penalty = 0.0
                for df in (-1, 0, 1):
                    f = k_file + df
                    if 0 <= f <= 7:
                        near = k_rank + step
                        if 0 <= near <= 7:
                            piece = board.piece_at(chess.square(f, near))
                            if piece is None or piece.piece_type != chess.PAWN or piece.color != color:
                                shield_penalty += 1.0
                        far = k_rank + 2 * step
                        if 0 <= far <= 7:
                            piece = board.piece_at(chess.square(f, far))
                            if piece is None or piece.piece_type != chess.PAWN or piece.color != color:
                                shield_penalty += 0.5
                if color == chess.WHITE:
                    score -= shield_penalty * king_safety * shield_phase
                else:
                    score += shield_penalty * king_safety * shield_phase

        # 5c. Passed Pawns — decisive in endgames (weight was previously unused)
        passed_weight = w.passed_pawn_weight
        if passed_weight:
            white_pawns = list(board.pieces(chess.PAWN, chess.WHITE))
            black_pawns = list(board.pieces(chess.PAWN, chess.BLACK))
            for pawn_sq, color, enemies in (
                [(sq, chess.WHITE, black_pawns) for sq in white_pawns] +
                [(sq, chess.BLACK, white_pawns) for sq in black_pawns]
            ):
                f = chess.square_file(pawn_sq)
                r = chess.square_rank(pawn_sq)
                is_pass = True
                for e_sq in enemies:
                    if abs(chess.square_file(e_sq) - f) <= 1:
                        if color == chess.WHITE and chess.square_rank(e_sq) > r:
                            is_pass = False
                            break
                        if color == chess.BLACK and chess.square_rank(e_sq) < r:
                            is_pass = False
                            break
                if is_pass:
                    # Advancement: 0 (home) .. 5 (6th rank, one step from promotion)
                    adv = (r - 1) if color == chess.WHITE else (6 - r)
                    boost = 1.0 + (1.0 - phase)  # up to 2x in endgame
                    bonus = passed_weight * (0.6 + 0.4 * adv / 5.0) * boost
                    score += bonus if color == chess.WHITE else -bonus

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
