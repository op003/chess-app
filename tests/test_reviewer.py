"""
Unit tests for the Game Reviewer engine.
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.engine.reviewer import GameReviewer, cp_to_win_pct, win_pct_to_move_accuracy


class TestGameReviewer(unittest.TestCase):
    def test_win_percentage_model(self):
        # 0 cp should be exactly 50%
        self.assertAlmostEqual(cp_to_win_pct(0), 50.0, places=1)
        # Positive cp should be > 50%
        self.assertGreater(cp_to_win_pct(200), 50.0)
        # Negative cp should be < 50%
        self.assertLess(cp_to_win_pct(-200), 50.0)

    def test_move_accuracy_calculation(self):
        # Zero loss should be 100% accuracy
        acc_perfect = win_pct_to_move_accuracy(50.0, 50.0)
        self.assertAlmostEqual(acc_perfect, 100.0, places=1)

        # Minor loss should still have good accuracy
        acc_minor = win_pct_to_move_accuracy(50.0, 48.0)
        self.assertGreater(acc_minor, 85.0)

        # Huge loss should have low accuracy
        acc_blunder = win_pct_to_move_accuracy(75.0, 20.0)
        self.assertLess(acc_blunder, 20.0)

    def test_review_game_moves(self):
        # King's Gambit opening moves
        moves = ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3"]
        reviewer = GameReviewer(depth=2)
        report = reviewer.review_game(moves)

        self.assertIn("summary", report)
        self.assertIn("moves", report)
        self.assertIn("eval_history", report)

        sum_data = report["summary"]
        self.assertGreaterEqual(sum_data["white_accuracy"], 0.0)
        self.assertLessEqual(sum_data["white_accuracy"], 100.0)
        self.assertGreaterEqual(sum_data["black_accuracy"], 0.0)
        self.assertLessEqual(sum_data["black_accuracy"], 100.0)

        self.assertEqual(len(report["moves"]), len(moves))
        first_move = report["moves"][0]
        self.assertEqual(first_move["uci"], "e2e4")
        self.assertIn(first_move["classification"], ["book", "best", "excellent", "good"])
        self.assertIn("best_san", first_move)
        self.assertIn("accuracy", first_move)


if __name__ == "__main__":
    unittest.main()
