"""
Tests for the new features: Alien Gambit style, king safety evaluation,
arena tournament module, per-personality trained weights, and the
promotion dialog fix (JS, run via node when available).
"""
import json
import os
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import chess

from app.engine.evaluator import Evaluator, EvalWeights
from app.engine.openings import GAMBITS, get_gambit_by_id, find_gambit_continuation
from app.engine.bot import ChessBot, BOT_PERSONALITIES
from app.engine.trainer import BotTrainer, GAMBIT_TRAINING_POSITIONS


class TestAlienGambit(unittest.TestCase):
    def test_alien_gambit_in_book(self):
        """The Alien Gambit opening must exist with the Nxf7 sacrifice line."""
        gambit = get_gambit_by_id("alien_gambit")
        self.assertIsNotNone(gambit)
        self.assertEqual(gambit["color"], "white")
        # The signature sacrifice: knight g5 takes f7
        self.assertIn("g5f7", gambit["moves"])

    def test_alien_gambit_book_continuation(self):
        """After the Caro-Kann main moves the book plays the Nxf7 sac line."""
        moves = ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4", "g8f6", "e4g5", "h7h6"]
        continuation = find_gambit_continuation(moves, preferred_gambit_id="alien_gambit")
        self.assertEqual(continuation, "g5f7")

    def test_alien_gambit_personality_exists(self):
        self.assertIn("alien_gambit", BOT_PERSONALITIES)
        personality = BOT_PERSONALITIES["alien_gambit"]
        self.assertEqual(personality["preferred_gambits"][0], "alien_gambit")
        # Brilliant-focused: extreme aggression + low own-king-safety concern
        self.assertGreater(personality["weights"].gambit_aggression, 2.5)
        self.assertLess(personality["weights"].king_safety_weight, 10.0)

    def test_alien_bot_plays_legal_moves(self):
        bot = ChessBot("alien_gambit")
        board = chess.Board()
        move, stats = bot.choose_move(board, depth=2, max_time=0.5)
        self.assertIsNotNone(move)
        self.assertIn(move, board.legal_moves)


class TestKingSafetyEval(unittest.TestCase):
    def test_king_safety_weight_exists(self):
        weights = EvalWeights()
        self.assertTrue(hasattr(weights, "king_safety_weight"))
        self.assertGreater(weights.king_safety_weight, 0)

    def test_start_position_balanced(self):
        """The pawn-shield term must be symmetric at the starting position."""
        evaluator = Evaluator(EvalWeights())
        self.assertAlmostEqual(evaluator.evaluate(chess.Board()), 0, delta=50)

    def test_naked_king_penalized(self):
        """A king without a pawn shield should evaluate worse for that side."""
        weights = EvalWeights()
        evaluator = Evaluator(weights)
        shielded = chess.Board()  # both kings shielded -> symmetric
        base = evaluator.evaluate(shielded)

        # Strip white's kingside pawns (g2, h2): white king loses its shield
        naked = chess.Board()
        naked.remove_piece_at(chess.G2)
        naked.remove_piece_at(chess.H2)
        stripped = evaluator.evaluate(naked)
        self.assertLess(stripped, base - 20)  # white must be penalized

    def test_mutation_bounds_respected(self):
        trainer = BotTrainer(output_path="/tmp/test_weights.json")
        base = EvalWeights()
        for _ in range(50):
            child = trainer.mutate_weights(base, mutation_rate=0.5)
            self.assertTrue(0.0 <= child.king_safety_weight <= 60.0)
            self.assertTrue(55.0 <= child.pawn_val <= 140.0)
            self.assertTrue(1.0 <= child.gambit_aggression <= 4.0)


class TestArenaModule(unittest.TestCase):
    def test_arena_import_and_seeds(self):
        import arena
        seeds = arena.build_seeds()
        seed_ids = [s["id"] for s in seeds]
        self.assertIn("alien_gambit", seed_ids)
        self.assertGreaterEqual(len(seeds), 6)
        # Every personality participates
        self.assertGreaterEqual(len(arena.BOT_PERSONALITIES), 6)
        stats = arena.new_stats()
        self.assertEqual(set(stats.keys()), set(arena.BOT_PERSONALITIES.keys()))

    def test_arena_elo_update(self):
        import arena
        stats = arena.new_stats()
        record = {
            "white": "tal", "black": "morphy", "plies": 40,
            "result": "1-0", "reason": "checkmate", "white_score": 1.0,
        }
        arena.apply_result(stats, record)
        self.assertEqual(stats["tal"]["wins"], 1)
        self.assertEqual(stats["morphy"]["losses"], 1)
        self.assertGreater(stats["tal"]["elo"], 1500)
        self.assertLess(stats["morphy"]["elo"], 1500)


class TestPerPersonalityWeights(unittest.TestCase):
    def test_server_loads_personality_weights(self):
        """When a per-personality weights file exists, the server must use it."""
        from app import server
        test_path = server._personality_weights_path("tal")
        saved = None
        if os.path.exists(test_path):
            saved = EvalWeights.load(test_path)
            os.remove(test_path)
        try:
            weights = EvalWeights(name="Tal Tuned", gambit_aggression=2.9)
            weights.save(test_path)
            loaded = server._load_personality_weights("tal")
            self.assertIsNotNone(loaded)
            self.assertAlmostEqual(loaded.gambit_aggression, 2.9)
        finally:
            if os.path.exists(test_path):
                os.remove(test_path)
            if saved is not None:
                saved.save(test_path)

    def test_server_personalities_endpoint_includes_alien(self):
        from app.server import get_personalities
        result = get_personalities()
        ids = [p["id"] for p in result["personalities"]]
        self.assertIn("alien_gambit", ids)
        self.assertIn("tal", ids)
        for p in result["personalities"]:
            self.assertIn("has_trained_weights", p)


class TestPromotionDialogJS(unittest.TestCase):
    def test_promotion_flow_node_test(self):
        """Runs tests/promotion.test.mjs (node) verifying the dialog applies the chosen piece."""
        node = None
        for candidate in ("node", "/usr/local/bin/node"):
            try:
                subprocess.run([candidate, "--version"], capture_output=True, check=True)
                node = candidate
                break
            except Exception:
                continue
        if not node:
            self.skipTest("node is not available")
        test_file = os.path.join(os.path.dirname(__file__), "promotion.test.mjs")
        result = subprocess.run([node, test_file], capture_output=True, text=True, timeout=60)
        self.assertEqual(
            result.returncode, 0,
            f"promotion tests failed:\n{result.stdout[-2000:]}\n{result.stderr[-1000:]}"
        )


if __name__ == "__main__":
    unittest.main()
