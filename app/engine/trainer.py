"""
AI Bot Trainer: Self-Play Reinforcement Learning & Evolutionary Optimization
Tuning Chess Evaluation Weights specifically for Aggressive Gambit Play.
"""
import copy
import random
import time
from typing import Callable, Dict, List, Optional, Any
import chess
from .evaluator import Evaluator, EvalWeights
from .search import SearchEngine
from .openings import GAMBITS

# List of gambit starting FENs / move sequences to train against
GAMBIT_TRAINING_POSITIONS = [
    # King's Gambit Accepted / Declined
    ("King's Gambit", ["e2e4", "e7e5", "f2f4"]),
    # Evans Gambit
    ("Evans Gambit", ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4"]),
    # Danish Gambit
    ("Danish Gambit", ["e2e4", "e7e5", "d2d4", "e5d4", "c2c3", "d4c3", "f1c4"]),
    # Stafford Gambit
    ("Stafford Gambit", ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6", "e5c6", "d7c6"]),
    # Queen's Gambit
    ("Queen's Gambit", ["d2d4", "d7d5", "c2c4"]),
    # Smith-Morra Gambit
    ("Smith-Morra", ["e2e4", "c7c5", "d2d4", "c5d4", "c2c3"]),
    # Budapest Gambit
    ("Budapest Gambit", ["d2d4", "g8f6", "c2c4", "e7e5", "d4e5", "f6g4"]),
    # Blackmar-Diemer
    ("Blackmar-Diemer", ["d2d4", "d7d5", "e2e4", "d5e4", "b1c3", "g8f6", "f2f3"]),
]


class BotTrainer:
    def __init__(self, output_path: str = "weights/trained_bot.json"):
        self.output_path = output_path
        self.is_training = False
        self.current_generation = 0
        self.total_generations = 0
        self.history: List[Dict[str, Any]] = []

    def mutate_weights(self, base_weights: EvalWeights, mutation_rate: float = 0.15) -> EvalWeights:
        """Creates a mutated child weight vector for evolutionary self-play."""
        child = copy.deepcopy(base_weights)
        fields = [
            "mobility_weight",
            "center_control_weight",
            "king_attack_weight",
            "development_weight",
            "open_file_weight",
            "bishop_pair_weight",
            "passed_pawn_weight",
            "pawn_structure_weight",
            "gambit_aggression",
            "knight_val",
            "bishop_val"
        ]

        for field in fields:
            if random.random() < 0.6:
                val = getattr(child, field)
                delta = (random.random() * 2 - 1) * mutation_rate * val
                new_val = max(1.0, val + delta)
                setattr(child, field, round(new_val, 2))

        child.name = f"Gen-{self.current_generation} Mutated"
        return child

    def play_self_game(
        self,
        white_eval: Evaluator,
        black_eval: Evaluator,
        initial_moves: List[str],
        depth: int = 2,
        max_plies: int = 40,
        move_callback: Optional[Callable[[str, int, str], None]] = None
    ) -> float:
        """
        Plays one game between White and Black evaluators from a gambit position.
        Returns: 1.0 if White wins, 0.0 if Black wins, 0.5 for draw / evaluation score.
        """
        board = chess.Board()
        # Apply initial opening moves
        for m_str in initial_moves:
            try:
                move = chess.Move.from_uci(m_str)
                if move in board.legal_moves:
                    board.push(move)
            except Exception:
                pass

        white_search = SearchEngine(white_eval)
        black_search = SearchEngine(black_eval)

        plies = 0
        while not board.is_game_over() and plies < max_plies:
            turn = board.turn
            engine = white_search if turn == chess.WHITE else black_search
            best_move, _, _ = engine.find_best_move(board, depth=depth, max_time=0.15)

            if not best_move or best_move not in board.legal_moves:
                break

            san = board.san(best_move)
            board.push(best_move)
            plies += 1

            if move_callback:
                move_callback(board.fen(), plies, san)

        # Result resolution
        if board.is_checkmate():
            return 1.0 if board.turn == chess.BLACK else 0.0
        elif board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
            return 0.5
        else:
            # Score by positional quality and king attack
            final_eval = white_eval.evaluate(board)
            if final_eval > 150:
                return 1.0
            elif final_eval < -150:
                return 0.0
            else:
                return 0.5

    def train_evolutionary(
        self,
        generations: int = 5,
        games_per_pair: int = 2,
        search_depth: int = 2,
        initial_weights: Optional[EvalWeights] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> EvalWeights:
        """
        Executes evolutionary self-play reinforcement learning to optimize weights.
        """
        self.is_training = True
        self.total_generations = generations

        champion_weights = copy.deepcopy(initial_weights or EvalWeights(name="Champion"))
        population_size = 3

        for gen in range(1, generations + 1):
            if not self.is_training:
                break

            self.current_generation = gen
            start_gen_time = time.time()

            # Create candidate population with mutations
            candidates = [champion_weights]
            for _ in range(population_size - 1):
                candidates.append(self.mutate_weights(champion_weights, mutation_rate=0.20))

            scores = [0.0] * len(candidates)
            total_games = 0

            # Tournament between candidates over gambit start positions
            for pos_name, moves in GAMBIT_TRAINING_POSITIONS[:3]:
                for i in range(len(candidates)):
                    for j in range(i + 1, len(candidates)):
                        for _ in range(max(1, games_per_pair)):
                            if not self.is_training:
                                break

                            # Game 1: i is White, j is Black
                            res = self.play_self_game(
                                Evaluator(candidates[i]),
                                Evaluator(candidates[j]),
                                moves,
                                depth=search_depth,
                                max_plies=20
                            )
                            scores[i] += res
                            scores[j] += (1.0 - res)
                            total_games += 1

                            # Game 2: j is White, i is Black (color balance)
                            res2 = self.play_self_game(
                                Evaluator(candidates[j]),
                                Evaluator(candidates[i]),
                                moves,
                                depth=search_depth,
                                max_plies=20
                            )
                            scores[j] += res2
                            scores[i] += (1.0 - res2)
                            total_games += 1

            # Determine generation champion
            best_idx = scores.index(max(scores))
            champion_weights = candidates[best_idx]
            champion_weights.name = f"Trained Bot (Gen {gen})"

            elapsed = round(time.time() - start_gen_time, 2)
            gen_stats = {
                "generation": gen,
                "total_generations": generations,
                "best_score": round(scores[best_idx], 2),
                "total_games": total_games,
                "elapsed_seconds": elapsed,
                "mobility_weight": champion_weights.mobility_weight,
                "king_attack_weight": champion_weights.king_attack_weight,
                "center_control_weight": champion_weights.center_control_weight,
                "gambit_aggression": champion_weights.gambit_aggression,
                "development_weight": champion_weights.development_weight,
            }
            self.history.append(gen_stats)

            # Save updated weights
            try:
                champion_weights.save(self.output_path)
            except Exception:
                pass

            if progress_callback:
                progress_callback(gen_stats)

        self.is_training = False
        return champion_weights

    def stop_training(self):
        self.is_training = False
