#!/usr/bin/env python3
"""
CLI Script to Train the Chess AI Bot using Self-Play & Gambit Optimization.
Usage:
    python3 train.py --generations 5 --depth 2 --output weights/trained_bot.json
"""
import argparse
import sys
import os

# Add local directory to python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.engine.trainer import BotTrainer
from app.engine.evaluator import EvalWeights


def main():
    parser = argparse.ArgumentParser(description="Train Chess Bot on Gambit Play")
    parser.add_argument("--generations", type=int, default=3, help="Number of evolutionary generations")
    parser.add_argument("--depth", type=int, default=2, help="Search depth for self-play evaluation")
    parser.add_argument("--output", type=str, default="weights/trained_bot.json", help="Output path for weights")
    args = parser.parse_args()

    print("=" * 60)
    print("🔥 CHESS BOT TRAINING LAB: GAMBIT OPTIMIZER 🔥")
    print(f"Target Generations: {args.generations}")
    print(f"Self-play Depth:   {args.depth}")
    print(f"Output File:       {args.output}")
    print("=" * 60)

    trainer = BotTrainer(output_path=args.output)

    def on_progress(stats):
        print(f"\n[Generation {stats['generation']}/{stats['total_generations']}]", flush=True)
        print(f"  Games Played:        {stats['total_games']}", flush=True)
        print(f"  Best Score:          {stats['best_score']}", flush=True)
        print(f"  Mobility Weight:     {stats['mobility_weight']}", flush=True)
        print(f"  King Attack Weight:  {stats['king_attack_weight']}", flush=True)
        print(f"  Center Control:      {stats['center_control_weight']}", flush=True)
        print(f"  Gambit Aggression:   {stats['gambit_aggression']}", flush=True)
        print(f"  Elapsed:             {stats['elapsed_seconds']}s", flush=True)

    best_weights = trainer.train_evolutionary(
        generations=args.generations,
        search_depth=args.depth,
        progress_callback=on_progress
    )

    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print(f"Saved optimized champion weights to: {args.output}")
    print(f"Summary: Aggression={best_weights.gambit_aggression}, KingAttack={best_weights.king_attack_weight}")
    print("=" * 60)


if __name__ == "__main__":
    main()
