# ♟️ Gambit Master: Top Style Chess & AI Training Lab

A feature-packed chess game built specifically for tactical gambit play and custom AI bot training.

## 🌟 Key Features

### 1. ⚔️ Top Gambit Openings Database & Repertoire
Includes complete opening theory, strategic ideas, key tactical targets, and famous traps for the top gambits:
* **Top White Gambits**:
  * **King's Gambit** (`1. e4 e5 2. f4`) - The romantic immortal classic.
  * **Queen's Gambit** (`1. d4 d5 2. c4`) - World championship standard.
  * **Evans Gambit** (`1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4`) - Morphy & Kasparov's tactical weapon.
  * **Danish Gambit** (`1. e4 e5 2. d4 exd4 3. c3 dxc3 4. Bc4 cxb2 5. Bxb2`) - Double pawn sacrifice for laser bishops.
  * **Vienna Gambit** (`1. e4 e5 2. Nc3 Nf6 3. f4`) - Steinitz's central strike.
  * **Smith-Morra Gambit** (`1. e4 c5 2. d4 cxd4 3. c3`) - Sicilian defense destroyer.
  * **Scotch Gambit** (`1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Bc4`) - Rapid development against e5.
  * **Blackmar-Diemer Gambit** (`1. d4 d5 2. e4 dxe4 3. Nc3 Nf6 4. f3`) - Aggressive 1.d4 bloodbath.
  * **Halloween Gambit** (`1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Nxe5!?`) - Shock value minor piece sacrifice.
  * **Alien Gambit** (`1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Ng5 h6 6. Nxf7!!`) - Witty_Alien's brilliant knight sacrifice.
* **Top Black Counter-Gambits**:
  * **Stafford Gambit** (`1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6 4. Nxc6 dxc6`) - Eric Rosen's viral trap ambush.
  * **Budapest Gambit** (`1. d4 Nf6 2. c4 e5 3. dxe5 Ng4`) - Sharp counterpunch against 1.d4.
  * **Benko Gambit** (`1. d4 Nf6 2. c4 c5 3. d5 b5`) - Long-term queenside pressure.
  * **Englund Gambit** (`1. d4 e5 2. dxe5 Nc6`) - Trick-filled trap machine.
  * **Latvian Gambit** (`1. e4 e5 2. Nf3 f5`) - Fearless inverted King's Gambit.
  * **Albin Countergambit** (`1. d4 d5 2. c4 e5 3. dxe5 d4`) - The Lasker underpromotion trap.

---

### 2. 🧙‍♂️ AI Bot Personalities with Gambit Evaluation
Unlike conventional engines that shy away from gambits due to strict pawn counting, the Gambit Master engine features dynamic evaluation weights:
* **Mikhail Tal (The Magician)**: Sacrifices pawns and pieces willingly for open files and mating attacks.
* **Paul Morphy (The Romantic)**: Prioritizes rapid development, piece harmony, and central tempos.
* **Garry Kasparov (The Boss)**: Dynamic calculation with suffocating central pressure.
* **The Trap Master**: Plays for venomous tactical tricks and counter-gambits (Stafford specialist).
* **Alien Gambit (The Invader)** 👽: Obsessed with *brilliant* sacrifices — hunts the naked enemy king with engine-approved Nxf7!! style blows.
* **Custom Trained AI Bot**: Plays using your self-trained neural/heuristic weights!

The lineup can be pruned to the strongest styles using the built-in arena tournament (see below).

---

### 3. 🧬 AI Bot Training Lab (Self-Play Reinforcement Learning)
* **Evolutionary Self-Play Tournament**: Pits mutated candidate evaluators across top gambit positions (King's Gambit, Evans, Danish, Stafford, Alien, etc.).
* **Tunable Parameters**: Automatically optimizes piece mobility, king attack pressure, king safety (pawn shield), center control, open files, and sacrifice valuation.
* **Interactive Real-Time Dashboard**: Watch training progress, generations, win rates, and live weights via WebSockets!
* **CLI Training**: Run `python3 train.py --generations 5 --depth 2` directly from your terminal.
* **Per-Personality Training**: `python3 train.py --personality tal` tunes a specific style and saves to `weights/trained_<id>.json` (auto-loaded by the server).

---

### 3b. ⚔️ Arena Tournament (`arena.py`)
Rank every playing style against every other style in a long-running double round-robin:
```bash
python3 arena.py --hours 24 --depth 3          # full 24-hour arena (checkpointed after every game)
python3 arena.py --resume --hours 24           # continue a previous run with ratings intact
```
* **Elo + W-D-L standings** recalculated after each game in `tournament/standings.json`.
* Every game recorded in `tournament/games.jsonl`; 8 signature gambit openings rotate per cycle, colors balanced.
* Ply-capped games are adjudicated by a **neutral** evaluator (no style bias).


---

### 4. 📊 Game Review & Precision Accuracy Analysis
* **Full-Game Post-Mortem**: Analyzes games ply-by-ply comparing each move against the engine's best lines.
* **Accuracy Percentage (0–100%)**: Computes CAPS2-style win percentage preservation for White and Black.
* **Move Quality Classifications**:
  * 💎 **Brilliant (!!)**: Tactical piece sacrifice leading to a winning initiative.
  * ⭐ **Best Move (★)**: Engine's highest-scoring continuation.
  * ✨ **Excellent**: Very strong, natural tactical play.
  * 👍 **Good**: Solid move maintaining the evaluation.
  * 📖 **Book Move**: Matches established gambit opening theory.
  * ⚠️ **Inaccuracy (?!)**: Suboptimal play conceding minor pressure.
  * ❓ **Mistake (?)**: Concedes significant counterplay or drops advantage.
  * ❌ **Blunder (??)**: Severe error or tactical oversight.
* **Interactive Evaluation Graph**: Visualizes the flow of the game with color-coded classification markers. Clicking any point scrubs the board directly to that position.
* **Visual Best Move Hints**: Highlights the square and destination the player should have chosen to learn from mistakes.
* **"Next Key Move" Navigation**: Jump directly to blunders and turning points.

---

### 5. 🎮 Rich Interactive Chess UI
* **High-DPI Vector Pieces**: Crisp SVG pieces for all screen resolutions.
* **Interactive Board**: Click-to-move, legal move indicator dots, capture target rings, last move highlight, and king-in-check alerts.
* **Dynamic Evaluation Meter**: Live vertical centipawn evaluation bar.
* **Procedural Sound Engine**: Move, capture, check, and castling audio powered by the Web Audio API (zero external downloads needed).
* **Pawn Promotion Modal**: Queen, Rook, Bishop, Knight choices.
* **Move History**: Algebraic notation (SAN) tracking and FEN export.

---

## 🚀 How to Run

### Option 1: Quick Launch
```bash
chmod +x run.sh
./run.sh
```

### Option 2: Using uv or python
```bash
uv run python main.py
```
Then open your browser at **`http://127.0.0.1:8000`**.

---

## 🧪 Training the Bot from Command Line

```bash
python3 train.py --generations 5 --depth 2 --output weights/trained_bot.json
# Or tune one specific style (e.g. the tournament's top-5):
python3 train.py --personality tal --generations 6 --depth 2
```
The trained weights are automatically saved to `weights/trained_bot.json` (or `weights/trained_<id>.json` for a specific personality) and loaded by the server on the next bot move!
