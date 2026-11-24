"""
Automated unit tests for Gambit Master Chess Engine & API.
"""
import sys
import os
import unittest
import chess

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.engine.evaluator import Evaluator, EvalWeights
from app.engine.openings import GAMBITS, get_gambit_by_id, find_gambit_continuation
from app.engine.search import SearchEngine
from app.engine.bot import ChessBot, BOT_PERSONALITIES


class TestGambitEngine(unittest.TestCase):
    def test_openings_database(self):
        """Verify gambits exist and have required structure."""
        self.assertGreaterEqual(len(GAMBITS), 10)
        self.assertIn("kings_gambit", GAMBITS)
        self.assertIn("stafford_gambit", GAMBITS)
        self.assertIn("evans_gambit", GAMBITS)

        kg = get_gambit_by_id("kings_gambit")
        self.assertEqual(kg["color"], "white")
        self.assertIn("moves", kg)
        self.assertEqual(kg["moves"][:3], ["e2e4", "e7e5", "f2f4"])

    def test_gambit_continuation(self):
        """Verify book lookup matches moves correctly."""
        # King's gambit initial moves
        moves = ["e2e4", "e7e5"]
        continuation = find_gambit_continuation(moves, preferred_gambit_id="kings_gambit")
        self.assertEqual(continuation, "f2f4")

    def test_evaluator(self):
        """Verify evaluator works and respects piece values and king attack."""
        board = chess.Board()
        evaluator = Evaluator()
        initial_eval = evaluator.evaluate(board)
        # Starting position should be roughly balanced (~0)
        self.assertAlmostEqual(initial_eval, 0, delta=50)

        # White plays e4
        board.push_san("e4")
        e4_eval = evaluator.evaluate(board)
        # White has center control and development advantage
        self.assertGreater(e4_eval, initial_eval)

    def test_search_engine(self):
        """Verify search engine finds legal moves without crashing."""
        board = chess.Board()
        evaluator = Evaluator()
        search = SearchEngine(evaluator)
        best_move, score, stats = search.find_best_move(board, depth=2, max_time=0.5)
        self.assertIsNotNone(best_move)
        self.assertIn(best_move, board.legal_moves)
        self.assertIn("nodes", stats)

    def test_bot_personalities(self):
        """Verify all bot personalities initialize properly."""
        for pid in BOT_PERSONALITIES:
            bot = ChessBot(pid)
            self.assertIsNotNone(bot.name)
            board = chess.Board()
            move, stats = bot.choose_move(board, depth=1, max_time=0.5)
            self.assertIsNotNone(move)
            self.assertIn(move, board.legal_moves)


if __name__ == "__main__":
    unittest.main()
