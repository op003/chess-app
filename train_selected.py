#!/usr/bin/env python3
"""
Train the selected top personalities from the arena tournament, with a
quality gate: each trained weight set must beat its own preset in a
verification match before it is adopted.

Usage:
    python3 train_selected.py --ids tal morphy kasparov rosen_trap trained \
        --generations 6 --positions 3 --games-per-pair 2 --depth 2 --parallel 2
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import chess

from app.engine.bot import ChessBot, BOT_PERSONALITIES
from app.engine.evaluator import Evaluator, EvalWeights
from app.engine.trainer import build_league_panel

GATE_OPENINGS = [
    ["e2e4", "e7e5", "f2f4"],                                  # King's Gambit
    ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4"],  # Caro-Kann (Alien territory)
    ["d2d4", "d7d5", "c2c4", "e7e6"],                          # QGD
    ["e2e4", "c7c5", "d2d4", "c5d4", "c2c3"],                  # Smith-Morra
]


def train_one(personality_id: str, generations: int, positions: int, games_per_pair: int, depth: int, fresh: bool = False, population: int = 2) -> dict:
    """Runs train.py for one personality in a subprocess. Returns result info."""
    out_path = f"weights/trained_{personality_id}.json"
    backup_path = f"weights/.backup_{personality_id}.json"

    had_previous = os.path.exists(out_path)
    if had_previous:
        shutil.copy(out_path, backup_path)
        os.remove(out_path)

    cmd = [
        sys.executable, "train.py",
        "--personality", personality_id,
        "--generations", str(generations),
        "--positions", str(positions),
        "--games-per-pair", str(games_per_pair),
        "--depth", str(depth),
        "--population", str(population),
        "--output", out_path,
    ]
    if fresh:
        cmd.append("--fresh")
    started = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    elapsed = time.time() - started

    ok = proc.returncode == 0 and os.path.exists(out_path)
    return {
        "personality": personality_id,
        "output": out_path,
        "train_ok": ok,
        "train_seconds": round(elapsed, 1),
        "stdout_tail": proc.stdout[-1500:] if proc.stdout else "",
        "stderr_tail": proc.stderr[-800:] if proc.stderr else "",
        "fresh_start": fresh,
    }


def verification_match(personality_id: str, games: int = 16, depth: int = 2, max_time: float = 0.15) -> dict:
    """
    OUT-OF-FAMILY verification: the trained weights play a diverse league panel
    (other personalities' presets + classical anchor) on balanced colors.
    A weight set that only beats its own family (inbred) will fail here.
    Adoption threshold: >= 45% of the points against the panel.
    """
    weights_path = f"weights/trained_{personality_id}.json"
    trained = ChessBot(personality_id, custom_weights=EvalWeights.load(weights_path))
    panel = build_league_panel(exclude_pid=personality_id)
    neutral_eval = Evaluator(EvalWeights())

    reps = max(1, games // (2 * len(panel) * len(GATE_OPENINGS)))
    trained_points = 0.0
    played = 0
    per_opponent = {}

    for opp_pid, opp_w in panel:
        opp_bot = ChessBot(opp_pid, custom_weights=opp_w)
        opp_points = 0.0
        opp_played = 0
        for seed_moves in GATE_OPENINGS:
            for trained_white in (True, False):
                for _rep in range(reps):
                    board = chess.Board()
                    for uci in seed_moves:
                        mv = chess.Move.from_uci(uci)
                        if mv in board.legal_moves:
                            board.push(mv)

                    plies = 0
                    while plies < 60 and not board.is_game_over():
                        is_trained_turn = (board.turn == chess.WHITE) == trained_white
                        bot = trained if is_trained_turn else opp_bot
                        move, _ = bot.choose_move(board, depth=depth, max_time=max_time)
                        if not move or move not in board.legal_moves:
                            move = next(iter(board.legal_moves), None)
                        if not move:
                            break
                        board.push(move)
                        plies += 1

                    if board.is_checkmate():
                        trained_won = (board.turn != chess.WHITE) == trained_white
                        score = 1.0 if trained_won else 0.0
                    elif board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
                        score = 0.5
                    else:
                        ev = neutral_eval.evaluate(board)
                        ev_from_trained = ev if trained_white else -ev
                        if ev_from_trained > 150:
                            score = 1.0
                        elif ev_from_trained < -150:
                            score = 0.0
                        else:
                            score = 0.5

                    trained_points += score
                    opp_points += score
                    played += 1
                    opp_played += 1
        per_opponent[opp_pid] = {
            "points": round(opp_points, 1),
            "games": opp_played,
            "pct": round(100.0 * opp_points / opp_played, 1) if opp_played else 0.0,
        }

    adopt = played > 0 and trained_points >= 0.45 * played
    return {
        "personality": personality_id,
        "mode": "league-out-of-family",
        "games": played,
        "trained_points": round(trained_points, 1),
        "trained_win_pct": round(100.0 * trained_points / played, 1) if played else 0.0,
        "per_opponent": per_opponent,
        "adopted": adopt,
    }


def process_personality(pid: str, args) -> dict:
    print(f"\n🧬 [{pid}] training started (generations={args.generations}, "
          f"positions={args.positions}, games/pair={args.games_per_pair}, depth={args.depth})")
    result = train_one(pid, args.generations, args.positions, args.games_per_pair, args.depth,
                       fresh=args.fresh, population=args.population)

    if not result["train_ok"]:
        # Restore any previous weights so the bot keeps working
        backup = f"weights/.backup_{pid}.json"
        if os.path.exists(backup):
            shutil.copy(backup, f"weights/trained_{pid}.json")
            os.remove(backup)
        result["verification"] = {"personality": pid, "adopted": False, "error": "training failed"}
        print(f"❌ [{pid}] training FAILED — previous weights restored")
        return result

    print(f"✅ [{pid}] trained in {result['train_seconds']}s — running verification match...")
    verdict = verification_match(pid, games=args.gate_games, depth=args.depth)
    result["verification"] = verdict

    if verdict["adopted"]:
        print(f"🏆 [{pid}] verified: {verdict['trained_points']}/{verdict['games']} "
              f"({verdict['trained_win_pct']}%) vs preset — ADOPTED")
    else:
        os.remove(f"weights/trained_{pid}.json")
        backup = f"weights/.backup_{pid}.json"
        if os.path.exists(backup):
            shutil.copy(backup, f"weights/trained_{pid}.json")
            os.remove(backup)
        print(f"⚠️ [{pid}] regressed: {verdict['trained_points']}/{verdict['games']} "
              f"({verdict['trained_win_pct']}%) vs preset — REJECTED, preset kept")
    return result


def main():
    parser = argparse.ArgumentParser(description="Train selected personalities with quality gate")
    parser.add_argument("--ids", nargs="+",
                        default=["trained", "morphy", "kasparov", "rosen_trap", "tal", "alien_gambit"])
    parser.add_argument("--generations", type=int, default=6)
    parser.add_argument("--positions", type=int, default=3)
    parser.add_argument("--games-per-pair", type=int, default=2)
    parser.add_argument("--depth", type=int, default=2)
    parser.add_argument("--parallel", type=int, default=2)
    parser.add_argument("--gate-games", type=int, default=16)
    parser.add_argument("--population", type=int, default=2,
                        help="Candidates per generation (2 = champion + 1 mutant)")
    parser.add_argument("--fresh", action="store_true",
                        help="Ignore existing trained_<id>.json lineages and restart from presets")
    args = parser.parse_args()

    print("=" * 70)
    print("🧬 TRAINING SELECTED PERSONALITIES (with verification gate)")
    print(f"    Styles: {', '.join(args.ids)}")
    print("=" * 70)

    started = time.time()
    with ThreadPoolExecutor(max_workers=max(1, args.parallel)) as pool:
        results = list(pool.map(lambda pid: process_personality(pid, args), args.ids))

    report = {
        "finished": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_seconds": round(time.time() - started, 1),
        "results": results,
    }
    with open("weights/training_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 70)
    print("📋 FINAL TRAINING REPORT")
    for r in results:
        v = r.get("verification", {})
        status = "ADOPTED ✅" if v.get("adopted") else ("FAILED ❌" if not r.get("train_ok") else "REJECTED ⚠️")
        detail = f"{v.get('trained_points', 0)}/{v.get('games', 0)} ({v.get('trained_win_pct', 0)}%)"
        print(f"    {r['personality']:<14} {status}  gate: {detail}")
    print(f"    Total time: {report['total_seconds']}s")
    print("=" * 70)


if __name__ == "__main__":
    main()
