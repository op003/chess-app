"""
High-Performance Alpha-Beta Search Engine with Move Ordering,
Quiescence Search, and Transposition Table.
"""
from typing import Optional, Tuple, List, Dict
import time
import chess
import chess.polyglot
from .evaluator import Evaluator

# Node type flags for Transposition Table
EXACT = 0
LOWERBOUND = 1
UPPERBOUND = 2

# Approximate piece values for MVV-LVA move ordering
PIECE_VALS = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}


class SearchTimeout(Exception):
    """Raised when search exceeds its allocated time limit."""
    pass


class SearchEngine:
    def __init__(self, evaluator: Evaluator):
        self.evaluator = evaluator
        self.tt: Dict[int, Tuple[int, int, int, Optional[chess.Move]]] = {}  # key: (score, depth, flag, best_move)
        self.killer_moves: List[List[Optional[chess.Move]]] = [[None, None] for _ in range(64)]
        self.history_scores: Dict[Tuple[chess.Square, chess.Square], int] = {}
        self.nodes_searched = 0
        self.start_time = 0.0
        self.time_limit = 1.0  # seconds
        self.allow_abort = False

    def clear(self):
        self.tt.clear()
        self.killer_moves = [[None, None] for _ in range(64)]
        self.history_scores.clear()

    def order_moves(
        self,
        board: chess.Board,
        ply: int,
        hash_move: Optional[chess.Move] = None,
        captures_only: bool = False
    ) -> List[chess.Move]:
        """
        Orders legal moves for optimal alpha-beta pruning efficiency:
        1. Hash move from Transposition Table
        2. MVV-LVA for captures (e.g. Pawn takes Queen before Queen takes Pawn)
        3. Killer moves (moves that produced cutoffs at this depth)
        4. History heuristic scores
        """
        moves = [
            m for m in board.legal_moves
            if not captures_only or board.is_capture(m) or m.promotion
        ]
        scores = []

        for move in moves:
            score = 0

            # 1. PV / Hash move
            if hash_move and move == hash_move:
                score += 1000000

            # 2. Captures: MVV-LVA
            if board.is_capture(move):
                attacker = board.piece_at(move.from_square)
                victim = board.piece_at(move.to_square)
                if victim:
                    victim_val = PIECE_VALS.get(victim.piece_type, 100)
                elif board.is_en_passant(move):
                    victim_val = 100
                else:
                    victim_val = 100
                attacker_val = PIECE_VALS.get(attacker.piece_type, 100) if attacker else 100
                score += 100000 + (victim_val * 10) - attacker_val

            # Promotion bonus
            if move.promotion:
                score += 80000

            # 3. Killer moves
            if not captures_only and ply < 64:
                if move == self.killer_moves[ply][0]:
                    score += 9000
                elif move == self.killer_moves[ply][1]:
                    score += 8000

            # 4. History heuristic
            if not captures_only:
                move_key = (move.from_square, move.to_square)
                score += self.history_scores.get(move_key, 0)

            scores.append((score, move))

        scores.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scores]

    def quiescence_search(self, board: chess.Board, alpha: int, beta: int, qply: int = 0) -> int:
        """
        Searches captures only to avoid the 'horizon effect' on tactical positions.
        """
        self.nodes_searched += 1

        if self.allow_abort and (self.nodes_searched & 255) == 0:
            if (time.time() - self.start_time) > self.time_limit:
                raise SearchTimeout()

        # Stand-pat score
        stand_pat = self.evaluator.evaluate(board)
        if board.turn == chess.BLACK:
            stand_pat = -stand_pat

        if stand_pat >= beta:
            return beta
        if stand_pat > alpha:
            alpha = stand_pat

        if qply >= 6:  # limit quiescence depth
            return stand_pat

        ordered_captures = self.order_moves(board, qply, captures_only=True)

        for move in ordered_captures:
            board.push(move)
            score = -self.quiescence_search(board, -beta, -alpha, qply + 1)
            board.pop()

            if score >= beta:
                return beta
            if score > alpha:
                alpha = score

        return alpha

    def alpha_beta(self, board: chess.Board, depth: int, alpha: int, beta: int, ply: int = 0) -> int:
        """
        Recursive Alpha-Beta search with Transposition Table and Move Ordering.
        """
        self.nodes_searched += 1

        # Check time limit periodically
        if self.allow_abort and (self.nodes_searched & 255) == 0:
            if (time.time() - self.start_time) > self.time_limit:
                raise SearchTimeout()

        # Game over conditions (checked before leaf horizon so mates at depth 0 aren't missed)
        if board.is_checkmate():
            return -20000 + ply
        if board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
            return 0

        # Transposition table lookup
        board_hash = chess.polyglot.zobrist_hash(board)
        hash_move = None
        if board_hash in self.tt:
            tt_score, tt_depth, tt_flag, tt_move = self.tt[board_hash]
            hash_move = tt_move
            if tt_depth >= depth:
                if tt_flag == EXACT:
                    return tt_score
                elif tt_flag == LOWERBOUND and tt_score > alpha:
                    alpha = tt_score
                elif tt_flag == UPPERBOUND and tt_score < beta:
                    beta = tt_score
                if alpha >= beta:
                    return tt_score

        # Leaf node check
        if depth <= 0:
            return self.quiescence_search(board, alpha, beta, 0)

        best_score = -999999
        best_move = None
        orig_alpha = alpha

        ordered_moves = self.order_moves(board, ply, hash_move)

        for move in ordered_moves:
            board.push(move)
            score = -self.alpha_beta(board, depth - 1, -beta, -alpha, ply + 1)
            board.pop()

            if score > best_score:
                best_score = score
                best_move = move

            if score > alpha:
                alpha = score

            if alpha >= beta:
                # Beta cutoff! Store killer move if quiet move
                if not board.is_capture(move) and ply < 64:
                    if self.killer_moves[ply][0] != move:
                        self.killer_moves[ply][1] = self.killer_moves[ply][0]
                        self.killer_moves[ply][0] = move
                    # Update history heuristic
                    m_key = (move.from_square, move.to_square)
                    self.history_scores[m_key] = self.history_scores.get(m_key, 0) + depth * depth
                break

        # Store in Transposition Table
        if len(self.tt) > 200000:
            self.tt.clear()
        if best_score <= orig_alpha:
            flag = UPPERBOUND
        elif best_score >= beta:
            flag = LOWERBOUND
        else:
            flag = EXACT

        self.tt[board_hash] = (best_score, depth, flag, best_move)
        return best_score

    def find_best_move(self, board: chess.Board, depth: int = 4, max_time: float = 1.0) -> Tuple[Optional[chess.Move], int, Dict]:
        """
        Finds the best move using iterative deepening up to specified depth and time limit.
        """
        self.nodes_searched = 0
        self.start_time = time.time()
        self.time_limit = max_time

        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return None, 0, {}

        if len(legal_moves) == 1:
            eval_score = self.evaluator.evaluate(board)
            return legal_moves[0], eval_score, {"nodes": 1, "depth": 1, "time": 0.001}

        best_move = legal_moves[0]
        best_score = 0
        completed_depth = 0

        # Iterative Deepening
        for current_depth in range(1, depth + 1):
            if time.time() - self.start_time >= self.time_limit and current_depth > 1:
                break

            self.allow_abort = (current_depth > 1)
            current_best_score = -999999
            current_best_move = None
            alpha = -999999
            beta = 999999

            board_hash = chess.polyglot.zobrist_hash(board)
            hash_move = self.tt.get(board_hash, (0, 0, 0, None))[3]
            ordered_moves = self.order_moves(board, 0, hash_move)

            try:
                for move in ordered_moves:
                    board.push(move)
                    try:
                        score = -self.alpha_beta(board, current_depth - 1, -beta, -alpha, 1)
                    finally:
                        board.pop()

                    if score > current_best_score:
                        current_best_score = score
                        current_best_move = move

                    if score > alpha:
                        alpha = score

                    if self.allow_abort and (time.time() - self.start_time) >= self.time_limit:
                        raise SearchTimeout()

                if current_best_move:
                    best_move = current_best_move
                    best_score = current_best_score
                    completed_depth = current_depth
            except SearchTimeout:
                # Discard partial depth iteration and retain last fully searched best_move
                break

        elapsed = time.time() - self.start_time
        stats = {
            "nodes": self.nodes_searched,
            "depth": completed_depth or 1,
            "time": round(elapsed, 3),
            "nps": int(self.nodes_searched / max(0.001, elapsed)),
            "score_cp": best_score if board.turn == chess.WHITE else -best_score
        }

        return best_move, best_score, stats
