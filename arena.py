#!/usr/bin/env python3
"""
Arena Tournament: every bot playing style battles every other style.

Double round-robin over a rotating set of gambit opening seeds.
Designed for very long runs (e.g. --hours 24): it checkpoints standings and
every game result after each game, so nothing is lost if the run is stopped.

Usage:
    python3 arena.py --hours 24                     # run up to 24 hours
    python3 arena.py --hours 1 --depth 2            # shorter / faster run
    python3 arena.py --max-games 4                  # smoke test

Outputs (in tournament/):
    standings.json  - live Elo / W-D-L table (rewritten after each game)
    games.jsonl     - one JSON record per completed game (append-only)
"""
import argparse
import json
import os
import random
import signal
import sys
import time
from itertools import combinations
from typing import Dict, List

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import chess

from app.engine.bot import ChessBot, BOT_PERSONALITIES
from app.engine.evaluator import Evaluator, EvalWeights

# Signature opening seeds used for the tournament pool (rotated every cycle)
TOURNAMENT_GAMBITS = [
    "kings_gambit",
    "evans_gambit",
    "stafford_gambit",
    "alien_gambit",
    "danish_gambit",
    "budapest_gambit",
    "benko_gambit",
    "queens_gambit",
]

MAX_SEED_PLIES = 6          # cap opening seed length (plies)
ADJUDICATION_CP = 150       # neutral-eval threshold when a ply-capped game is decided
ELO_K = 20.0


class Running:
    """Graceful shutdown flag for SIGTERM/SIGINT."""
    def __init__(self):
        self.value = True

    def stop(self, *_args):
        self.value = False


def build_seeds() -> List[dict]:
    """Opening seeds: (name, [uci moves]) truncated to MAX_SEED_PLIES."""
    from app.engine.openings import GAMBITS
    seeds = []
    for gid in TOURNAMENT_GAMBITS:
        gambit = GAMBITS.get(gid)
        if not gambit:
            continue
        seeds.append({
            "id": gid,
            "name": gambit["name"],
            "moves": gambit["moves"][:MAX_SEED_PLIES],
        })
    return seeds


def new_stats() -> Dict[str, dict]:
    stats = {}
    for pid, p in BOT_PERSONALITIES.items():
        stats[pid] = {
            "id": pid,
            "name": p["name"],
            "avatar": p["avatar"],
            "elo": 1500.0,
            "games": 0,
            "points": 0.0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "wins_white": 0,
            "games_white": 0,
            "games_black": 0,
            "checkmates_scored": 0,
            "avg_plies": 0.0,
        }
    return stats


def update_elo(stats: Dict[str, dict], white_id: str, black_id: str, white_score: float):
    ra = stats[white_id]["elo"]
    rb = stats[black_id]["elo"]
    expected_white = 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))
    stats[white_id]["elo"] = ra + ELO_K * (white_score - expected_white)
    stats[black_id]["elo"] = rb + ELO_K * ((1.0 - white_score) - (1.0 - expected_white))


def play_game(
    white_bot: ChessBot,
    black_bot: ChessBot,
    seed_moves: List[str],
    depth: int,
    max_time: float,
    max_plies: int,
    neutral_eval: Evaluator,
) -> dict:
    """Plays one game; returns a result record."""
    board = chess.Board()
    for uci in seed_moves:
        try:
            move = chess.Move.from_uci(uci)
            if move in board.legal_moves:
                board.push(move)
        except Exception:
            pass

    plies = len(board.move_stack)
    result = None
    reason = None
    start = time.time()

    while plies < max_plies:
        if board.is_game_over():
            break
        bot = white_bot if board.turn == chess.WHITE else black_bot
        try:
            move, _stats = bot.choose_move(board, depth=depth, max_time=max_time)
        except Exception:
            move = None
        if not move or move not in board.legal_moves:
            legal = list(board.legal_moves)
            if not legal:
                break
            move = legal[0]
        board.push(move)
        plies += 1

    elapsed = time.time() - start

    if board.is_checkmate():
        white_won = board.turn == chess.BLACK
        result = "1-0" if white_won else "0-1"
        reason = "checkmate"
    elif board.is_stalemate():
        result, reason = "1/2-1/2", "stalemate"
    elif board.is_insufficient_material():
        result, reason = "1/2-1/2", "insufficient material"
    elif board.can_claim_draw():
        result, reason = "1/2-1/2", "draw rule (50-move / repetition)"
    else:
        # Adjudicate a ply-capped game with the neutral evaluator
        score = neutral_eval.evaluate(board)
        if score > ADJUDICATION_CP:
            result, reason = "1-0", f"adjudicated (eval +{score:.0f}cp)"
        elif score < -ADJUDICATION_CP:
            result, reason = "0-1", f"adjudicated (eval {score:.0f}cp)"
        else:
            result, reason = "1/2-1/2", f"adjudicated draw (eval {score:.0f}cp)"

    white_score = {"1-0": 1.0, "0-1": 0.0, "1/2-1/2": 0.5}[result]
    return {
        "white": white_bot.personality_id,
        "black": black_bot.personality_id,
        "opening": seed_moves,
        "plies": plies,
        "result": result,
        "reason": reason,
        "white_score": white_score,
        "elapsed_s": round(elapsed, 1),
        "final_fen": board.fen(),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


def apply_result(stats: Dict[str, dict], record: dict):
    white_id, black_id = record["white"], record["black"]
    ws = record["white_score"]
    bs = 1.0 - ws

    for pid, score in ((white_id, ws), (black_id, bs)):
        s = stats[pid]
        s["games"] += 1
        s["points"] += score
        if score == 1.0:
            s["wins"] += 1
        elif score == 0.5:
            s["draws"] += 1
        else:
            s["losses"] += 1
        s["avg_plies"] = (
            (s["avg_plies"] * (s["games"] - 1) + record["plies"]) / s["games"]
        )

    if record["reason"] == "checkmate":
        winner = white_id if record["result"] == "1-0" else black_id
        stats[winner]["checkmates_scored"] += 1

    stats[white_id]["games_white"] += 1
    stats[black_id]["games_black"] += 1
    if record["result"] == "1-0":
        stats[white_id]["wins_white"] += 1

    update_elo(stats, white_id, black_id, ws)


def standings_table(stats: Dict[str, dict]) -> List[dict]:
    table = sorted(stats.values(), key=lambda s: (-s["elo"], -s["points"]))
    for s in table:
        s = s  # keep dict order stable
    return table


def save_standings(stats: Dict[str, dict], out_dir: str, status: str, cycle: int, games_played: int, config: dict):
    payload = {
        "status": status,
        "cycle": cycle,
        "games_played": games_played,
        "updated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "elo_k": ELO_K,
        "config": config,
        "standings": standings_table(stats),
    }
    tmp = os.path.join(out_dir, "standings.json.tmp")
    with open(tmp, "w") as f:
        json.dump(payload, f, indent=2)
    os.replace(tmp, os.path.join(out_dir, "standings.json"))


def print_standings(stats: Dict[str, dict], games_played: int):
    print(f"\n{'=' * 88}")
    print(f" STANDINGS after {games_played} games  ({time.strftime('%H:%M:%S')})")
    print(f"{'=' * 88}")
    print(f"{'Rank':<5}{'Bot':<34}{'Elo':>7}{'W-D-L':>12}{'Pts':>7}{'Win%':>7}")
    for rank, s in enumerate(standings_table(stats), 1):
        wpct = 100.0 * s["points"] / s["games"] if s["games"] else 0.0
        name = f"{s['avatar']} {s['name']}"
        print(f"{rank:<5}{name:<34}{s['elo']:>7.0f}{s['wins']}-{s['draws']}-{s['losses']:>3}"
              f"{s['points']:>7.0f}{wpct:>6.1f}%")
    print("=" * 88)


def main():
    parser = argparse.ArgumentParser(description="Bot style tournament arena")
    parser.add_argument("--hours", type=float, default=24.0, help="Time budget in hours")
    parser.add_argument("--depth", type=int, default=3, help="Search depth per move")
    parser.add_argument("--max-time", type=float, default=0.35, help="Per-move time cap (s)")
    parser.add_argument("--max-plies", type=int, default=80, help="Ply cap before adjudication")
    parser.add_argument("--max-games", type=int, default=0, help="Stop after N games (0 = no cap)")
    parser.add_argument("--out", type=str, default="tournament", help="Output directory")
    parser.add_argument("--resume", action="store_true",
                        help="Rebuild ratings from existing games.jsonl and continue after the last cycle")
    args = parser.parse_args()

    config = {
        "depth": args.depth,
        "max_time": args.max_time,
        "max_plies": args.max_plies,
        "hours_budget": args.hours,
    }

    os.makedirs(args.out, exist_ok=True)
    games_path = os.path.join(args.out, "games.jsonl")

    running = Running()
    signal.signal(signal.SIGTERM, running.stop)
    signal.signal(signal.SIGINT, running.stop)

    pool_ids = list(BOT_PERSONALITIES.keys())
    bots = {pid: ChessBot(pid) for pid in pool_ids}
    stats = new_stats()
    seeds = build_seeds()
    neutral_eval = Evaluator(EvalWeights())

    print("=" * 88)
    print("⚔️  ARENA TOURNAMENT — every style vs every style")
    print(f"    Pool          : {len(pool_ids)} styles -> {', '.join(pool_ids)}")
    print(f"    Openings      : {len(seeds)} seeds x 2 colors")
    print(f"    Time control  : depth {args.depth}, max {args.max_time}s/move, {args.max_plies} plies cap")
    print(f"    Budget        : {args.hours} h  (checkpoints after every game)")
    print("=" * 88)

    deadline = time.time() + args.hours * 3600.0
    games_played = 0
    cycle = 0

    # Resume: rebuild standings from the recorded games, then continue with new cycles
    if args.resume and os.path.exists(games_path):
        with open(games_path, "r") as f:
            previous = []
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    previous.append(json.loads(line))
                except Exception:
                    continue
        for record in previous:
            try:
                apply_result(stats, record)
            except Exception:
                continue
        games_played = len(previous)
        cycle = max((r.get("cycle", 0) for r in previous), default=0)
        print(f"↩️  Resumed: rebuilt ratings from {games_played} recorded games; continuing at cycle {cycle + 1}")

    with open(games_path, "a") as games_file:
        while running.value and time.time() < deadline:
            cycle += 1
            schedule = []
            for seed in seeds:
                for w_id, b_id in combinations(pool_ids, 2):
                    schedule.append((seed, w_id, b_id))
                    schedule.append((seed, b_id, w_id))
            random.Random(cycle * 7919).shuffle(schedule)

            print(f"\n--- Cycle {cycle}: {len(schedule)} games scheduled ---")
            for seed, w_id, b_id in schedule:
                if not running.value or time.time() >= deadline:
                    break
                if args.max_games and games_played >= args.max_games:
                    break

                record = play_game(
                    bots[w_id], bots[b_id], seed["moves"],
                    depth=args.depth, max_time=args.max_time,
                    max_plies=args.max_plies, neutral_eval=neutral_eval,
                )
                record["cycle"] = cycle
                record["opening_id"] = seed["id"]
                record["opening_name"] = seed["name"]
                del record["opening"]  # keep the jsonl lean

                apply_result(stats, record)
                games_played += 1

                games_file.write(json.dumps(record) + "\n")
                games_file.flush()

                print(
                    f"[{games_played:>4}] {seed['name']:<18} {w_id:<12} vs {b_id:<12} "
                    f"{record['result']:<8} ({record['reason']}, {record['plies']} plies, {record['elapsed_s']}s)"
                )

                save_standings(stats, args.out, "running", cycle, games_played, config)

                if games_played % 20 == 0:
                    print_standings(stats, games_played)

                if args.max_games and games_played >= args.max_games:
                    break

            if args.max_games and games_played >= args.max_games:
                break

    status = "completed" if time.time() >= deadline else "stopped"
    save_standings(stats, args.out, status, cycle, games_played, config)
    print_standings(stats, games_played)
    print(f"\n✅ Tournament finished ({status}). {games_played} games. Standings: {args.out}/standings.json")


if __name__ == "__main__":
    main()
