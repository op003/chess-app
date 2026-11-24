"""
Unit tests for the Chess Server endpoint functions directly.
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.server import (
    get_all_gambits,
    get_personalities,
    request_bot_move,
    evaluate_position,
    get_trained_weights,
    review_game,
    MoveRequest,
    EvalRequest,
    ReviewRequest
)


class TestServerAPI(unittest.TestCase):
    def test_get_gambits(self):
        res = get_all_gambits()
        self.assertIn("gambits", res)
        self.assertGreater(len(res["gambits"]), 5)

    def test_get_personalities(self):
        res = get_personalities()
        self.assertIn("personalities", res)
        p_ids = [p["id"] for p in res["personalities"]]
        self.assertIn("tal", p_ids)
        self.assertIn("morphy", p_ids)
        self.assertIn("kasparov", p_ids)

    def test_bot_move(self):
        req = MoveRequest(
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            personality="tal",
            depth=2
        )
        res = request_bot_move(req)
        self.assertIn("move", res)
        self.assertIn("san", res)
        self.assertIn("fen_after", res)
        self.assertIn("comment", res)

    def test_evaluate_position(self):
        req = EvalRequest(
            fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            personality="tal"
        )
        res = evaluate_position(req)
        self.assertIn("eval_cp", res)
        self.assertIn("eval_pawns", res)
        self.assertIn("turn", res)
        self.assertEqual(res["turn"], "black")

    def test_trained_weights(self):
        res = get_trained_weights()
        self.assertIn("mobility_weight", res)

    def test_review_game_endpoint(self):
        import asyncio
        req = ReviewRequest(moves=["e2e4", "e7e5", "g1f3", "b8c6"], depth=2)
        res = asyncio.run(review_game(req))
        self.assertIn("summary", res)
        self.assertIn("moves", res)
        self.assertIn("eval_history", res)
        self.assertEqual(len(res["moves"]), 4)


if __name__ == "__main__":
    unittest.main()
