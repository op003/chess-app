#!/usr/bin/env python3
"""
CLI Script to Train the Chess AI Bot using Self-Play & Gambit Optimization.

Train the generic "trained" bot:
    python3 train.py --generations 5 --depth 2

Train a specific personality (saves to weights/trained_<id>.json):
    python3 train.py --personality tal --generations 6 --depth 2
"""
import argparse
import sys
import os

# Add local directory to python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.engine.trainer import BotTrainer
from app.engine.evaluator import EvalWeights
from app.engine.bot import BOT_PERSONALITIES


def main():
    parser = argparse.ArgumentParser(description="Train Chess Bot on Gambit Play")
    parser.add_argument("--personality", type=str, default=None,
                        help="Train a specific personality id (e.g. tal, morphy, alien_gambit). "
                             "Saves to weights/trained_<id>.json")
    parser.add_argument("--generations", type=int, default=3, help="Number of evolutionary generations")
    parser.add_argument("--depth", type=int, default=2, help="Search depth for self-play evaluation")
    parser.add_argument("--positions", type=int, default=4, help="Gambit positions tested per generation")
    parser.add_argument("--output", type=str, default=None, help="Output path for weights")
    parser.add_argument("--fresh", action="store_true",
                        help="Start from the personality preset instead of continuing existing trained weights")
    args = parser.parse_args()

    if args.personality and args.personality in BOT_PERSONALITIES:
        preset_weights = BOT_PERSONALITIES[args.personality]["weights"]
        label = BOT_PERSONALITIES[args.personality]["name"]
        output_path = args.output or f"weights/trained_{args.personality}.json"
        champion_label = f"Trained {label}"
        base_weights = preset_weights
        start_gen = 0
        if not args.fresh and os.path.exists(output_path):
            try:
                continued = EvalWeights.load(output_path)
                base_weights = continued
                import re as _re
                m = _re.findall(r"\(Gen (\d+)\)", continued.name or "")
                start_gen = int(m[-1]) if m else 0
                print(f"↩️  Continuing evolution from {output_path} (lineage Gen {start_gen})")
            except Exception:
                print("⚠️  Could not load existing trained weights — starting from preset.")
    else:
        if args.personality:
            print(f"⚠️  Unknown personality '{args.personality}' — falling back to default weights.")
        base_weights = EvalWeights(name="Trained Bot")
        label = "Custom Trained AI Bot"
        output_path = args.output or "weights/trained_bot.json"
        champion_label = "Trained Bot"
        start_gen = 0
        if not args.fresh and os.path.exists(output_path):
            try:
                continued = EvalWeights.load(output_path)
                base_weights = continued
                import re as _re
                m = _re.findall(r"\(Gen (\d+)\)", continued.name or "")
                start_gen = int(m[-1]) if m else 0
                print(f"↩️  Continuing evolution from {output_path} (lineage Gen {start_gen})")
            except Exception:
                pass

    print("=" * 60)
    print("🔥 CHESS BOT TRAINING LAB: GAMBIT OPTIMIZER 🔥")
    print(f"Target Personality: {label}")
    print(f"Target Generations: {args.generations} (ending at Gen {start_gen + args.generations})")
    print(f"Self-play Depth:   {args.depth}")
    print(f"Positions per Gen: {args.positions}")
    print(f"Output File:       {output_path}")
    print("=" * 60)

    trainer = BotTrainer(output_path=output_path)

    def on_progress(stats):
        print(f"\n[Generation {stats['generation']}/{stats['total_generations']}]", flush=True)
        print(f"  Games Played:        {stats['total_games']}", flush=True)
        print(f"  Best Score:          {stats['best_score']}", flush=True)
        print(f"  Mobility Weight:     {stats['mobility_weight']}", flush=True)
        print(f"  King Attack Weight:  {stats['king_attack_weight']}", flush=True)
        print(f"  King Safety Weight:  {stats['king_safety_weight']}", flush=True)
        print(f"  Center Control:      {stats['center_control_weight']}", flush=True)
        print(f"  Gambit Aggression:   {stats['gambit_aggression']}", flush=True)
        print(f"  Pawn Value:          {stats['pawn_val']}", flush=True)
        print(f"  Elapsed:             {stats['elapsed_seconds']}s", flush=True)

    best_weights = trainer.train_evolutionary(
        generations=args.generations,
        search_depth=args.depth,
        positions_per_gen=args.positions,
        initial_weights=base_weights,
        champion_label=champion_label,
        start_generation=start_gen,
        progress_callback=on_progress
    )

    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print(f"Saved optimized champion weights to: {output_path}")
    print(f"Summary: Aggression={best_weights.gambit_aggression}, "
          f"KingAttack={best_weights.king_attack_weight}, KingSafety={best_weights.king_safety_weight}")
    print("=" * 60)


if __name__ == "__main__":
    main()
