/**
 * Main Application Orchestrator for Gambit Chess & AI Bot.
 */

class GambitChessApp {
    constructor() {
        this.board = null;
        this.userColor = 'w'; // 'w' or 'b'
        this.currentPersonality = 'trained';
        this.currentGambit = null;
        this.depth = 4;
        this.movesList = []; // list of UCI moves in this game
        this.sanMovesList = [];
        this.isBotThinking = false;
        this.capturedByWhite = [];
        this.capturedByBlack = [];
    }

    async init() {
        this.board = new ChessBoard('chessboard');
        this.board.onMoveCallback = (moveData) => this.handleUserMove(moveData);

        // Load gambits & personalities
        await window.gambitManager.loadGambits();
        await this.loadPersonalities();

        // Initialize Training Lab & Game Review
        window.trainingLab.init();
        window.gameReviewManager.init();

        this.bindEvents();
        this.updateStatus();
        this.updateEvaluation();
    }

    bindEvents() {
        // New Game buttons
        document.getElementById('btn-new-game-white').onclick = () => this.startNewGame('w');
        document.getElementById('btn-new-game-black').onclick = () => this.startNewGame('b');
        document.getElementById('btn-flip-board').onclick = () => this.board.flip();

        // Personality Select
        const pSelect = document.getElementById('personality-select');
        if (pSelect) {
            pSelect.onchange = (e) => this.selectPersonality(e.target.value);
        }

        // Gambit Select
        const gSelect = document.getElementById('gambit-select');
        if (gSelect) {
            gSelect.onchange = (e) => {
                const val = e.target.value;
                window.gambitManager.selectGambit(val);
                this.currentGambit = window.gambitManager.currentGambit;
            };
        }

        // Depth Slider
        const depthSlider = document.getElementById('depth-slider');
        const depthVal = document.getElementById('depth-value');
        if (depthSlider) {
            depthSlider.oninput = (e) => {
                this.depth = parseInt(e.target.value, 10);
                if (depthVal) depthVal.textContent = this.depth;
            };
        }

        // Sound Mute Toggle
        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.onclick = () => {
                window.sounds.muted = !window.sounds.muted;
                soundBtn.textContent = window.sounds.muted ? '🔇 Sound: Off' : '🔊 Sound: On';
            };
        }

        // Copy FEN / PGN
        document.getElementById('btn-copy-fen').onclick = () => {
            navigator.clipboard.writeText(this.board.getFen());
            alert('FEN copied to clipboard!');
        };
    }

    async loadPersonalities() {
        try {
            const res = await fetch('/api/personalities');
            const data = await res.json();
            const pSelect = document.getElementById('personality-select');
            if (!pSelect) return;

            pSelect.innerHTML = data.personalities.map(p => `
                <option value="${p.id}" ${p.id === this.currentPersonality ? 'selected' : ''}>
                    ${p.avatar} ${p.name}
                </option>
            `).join('');

            this.updatePersonalityCard(data.personalities.find(p => p.id === this.currentPersonality));
        } catch (e) {
            console.error('Failed to load personalities:', e);
        }
    }

    selectPersonality(pId) {
        this.currentPersonality = pId;
        const pSelect = document.getElementById('personality-select');
        if (pSelect) pSelect.value = pId;

        fetch('/api/personalities')
            .then(res => res.json())
            .then(data => {
                const found = data.personalities.find(p => p.id === pId);
                if (found) this.updatePersonalityCard(found);
            });
    }

    updatePersonalityCard(p) {
        if (!p) return;
        document.getElementById('bot-avatar').textContent = p.avatar;
        document.getElementById('bot-name').textContent = p.name;
        document.getElementById('bot-desc').textContent = p.description;

        this.setBotSpeech(`${p.name.split(' ')[0]}: "Let's play! Prepare for sharp tactics and bold sacrifices."`);
    }

    setBotSpeech(text) {
        const bubble = document.getElementById('bot-speech-bubble');
        if (bubble) {
            bubble.textContent = text;
            bubble.classList.remove('pulse');
            void bubble.offsetWidth; // trigger reflow
            bubble.classList.add('pulse');
        }
    }

    startNewGame(userColor = 'w') {
        this.userColor = userColor;
        this.board.flipped = (userColor === 'b');
        this.movesList = [];
        this.sanMovesList = [];
        this.capturedByWhite = [];
        this.capturedByBlack = [];
        this.board.loadFen(INITIAL_FEN);

        this.renderMoveHistory();
        this.renderCaptured();
        this.updateEvaluation();

        const pName = document.getElementById('bot-name').textContent.split(' ')[0];
        this.setBotSpeech(`${pName}: "A new battle begins! Show me your best opening."`);

        // If user is Black, Bot plays first move as White
        if (userColor === 'b') {
            this.triggerBotMove();
        }
    }

    startGambitGame(gambit) {
        this.currentGambit = gambit;
        const gSelect = document.getElementById('gambit-select');
        if (gSelect) gSelect.value = gambit.id;

        // User plays the gambit color or defends against it
        const userColor = gambit.color === 'white' ? 'w' : 'b';
        this.startNewGame(userColor);

        this.setBotSpeech(`Selected ${gambit.name}! The AI will accept the challenge and fight for the initiative.`);
    }

    handleUserMove(moveData) {
        this.movesList.push(moveData.uci);
        if (moveData.captured) {
            if (this.board.turn === 'b') { // White made the move
                this.capturedByWhite.push(moveData.captured);
            } else {
                this.capturedByBlack.push(moveData.captured);
            }
        }

        this.addMoveToHistory(moveData.uci);
        this.renderCaptured();
        this.updateEvaluation();

        // Check if game over
        if (this.checkGameOver()) return;

        // Trigger AI Bot move if it's the bot's turn
        const botTurn = (this.userColor === 'w' && this.board.turn === 'b') || (this.userColor === 'b' && this.board.turn === 'w');
        if (botTurn) {
            this.triggerBotMove();
        }
    }

    async triggerBotMove() {
        if (this.isBotThinking) return;
        this.isBotThinking = true;

        const thinkingIndicator = document.getElementById('bot-thinking');
        if (thinkingIndicator) thinkingIndicator.style.display = 'inline-block';

        try {
            const res = await fetch('/api/bot/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: this.board.getFen(),
                    moves: this.movesList,
                    personality: this.currentPersonality,
                    preferred_gambit: this.currentGambit ? this.currentGambit.id : null,
                    depth: this.depth
                })
            });

            if (!res.ok) {
                console.error('Bot move failed');
                return;
            }

            const data = await res.json();
            const botUci = data.move;

            // FIX: Track capture by bot — check turn BEFORE applying the move (board.turn is still the bot's turn)
            const toIdx = ChessBoard.algebraicToIndex(botUci.substring(2, 4));
            const targetPiece = this.board.squares[toIdx];
            const botTurnBeforeMove = this.board.turn;
            if (targetPiece) {
                if (botTurnBeforeMove === 'w') {
                    this.capturedByWhite.push(targetPiece);
                } else {
                    this.capturedByBlack.push(targetPiece);
                }
            }

            // Apply move to board
            this.board.applyBotMoveUci(botUci);
            this.movesList.push(botUci);

            this.addMoveToHistory(botUci, data.san);
            this.renderCaptured();
            this.updateEvaluation();

            // Set speech commentary
            if (data.comment) {
                this.setBotSpeech(data.comment);
            }

            this.checkGameOver();
        } catch (e) {
            console.error('Error getting bot move:', e);
        } finally {
            this.isBotThinking = false;
            if (thinkingIndicator) thinkingIndicator.style.display = 'none';
        }
    }

    async updateEvaluation() {
        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: this.board.getFen(),
                    personality: this.currentPersonality
                })
            });

            if (!res.ok) return;
            const data = await res.json();

            // Update Eval Bar
            const bar = document.getElementById('eval-bar-fill');
            const scoreLabel = document.getElementById('eval-score');
            const cp = data.eval_cp;
            const clampedPawns = Math.max(-10, Math.min(10, cp / 100.0));
            // Percentage from 0% (Black winning) to 100% (White winning)
            const pct = 50 + (clampedPawns * 5);

            if (bar) bar.style.height = `${pct}%`;
            if (scoreLabel) {
                const sign = cp > 0 ? '+' : '';
                scoreLabel.textContent = `${sign}${(cp / 100.0).toFixed(1)}`;
            }
        } catch (e) {
            console.error('Failed to update eval:', e);
        }
    }

    checkGameOver() {
        // Game over check: only count legal moves for the side whose turn it is
        let totalLegalMoves = 0;
        const currentTurn = this.board.turn;
        for (let i = 0; i < 64; i++) {
            const piece = this.board.squares[i];
            if (!piece) continue;
            const isWhitePiece = this.board.isWhitePiece(piece);
            if ((currentTurn === 'w' && !isWhitePiece) || (currentTurn === 'b' && isWhitePiece)) continue;
            totalLegalMoves += this.board.getLegalMoves(i).length;
            if (totalLegalMoves > 0) break; // early exit once we know game is not over
        }

        if (totalLegalMoves === 0) {
            if (this.board.checkSquare !== null) {
                const winner = this.board.turn === 'w' ? 'Black' : 'White';
                window.sounds.playVictory();
                this.setBotSpeech(`Checkmate! ${winner} is victorious! What a game!`);
                alert(`Checkmate! ${winner} wins!`);
            } else {
                this.setBotSpeech("Stalemate! The game ends in a tactical draw.");
                alert("Stalemate! Game is a draw.");
            }
            return true;
        }
        return false;
    }

    addMoveToHistory(uci, san = null) {
        const moveNumber = Math.floor(this.movesList.length / 2) + (this.movesList.length % 2);
        this.sanMovesList.push({ uci, san: san || uci });
        this.renderMoveHistory();
    }

    renderMoveHistory() {
        const container = document.getElementById('moves-table-body');
        if (!container) return;

        let html = '';
        for (let i = 0; i < this.sanMovesList.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const whiteMove = this.sanMovesList[i].san;
            const blackMove = this.sanMovesList[i + 1] ? this.sanMovesList[i + 1].san : '';

            html += `
                <tr>
                    <td class="col-num">${moveNum}.</td>
                    <td class="col-move">${whiteMove}</td>
                    <td class="col-move">${blackMove}</td>
                </tr>
            `;
        }

        container.innerHTML = html;
        const scrollBox = document.getElementById('moves-scroll');
        if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;
    }

    renderCaptured() {
        const whiteCapEl = document.getElementById('captured-by-white');
        const blackCapEl = document.getElementById('captured-by-black');

        if (whiteCapEl) {
            whiteCapEl.innerHTML = this.capturedByWhite.map(p => PIECE_SVGS[p] || '').join('');
        }
        if (blackCapEl) {
            blackCapEl.innerHTML = this.capturedByBlack.map(p => PIECE_SVGS[p] || '').join('');
        }
    }

    updateStatus() {
        const turnLabel = document.getElementById('status-turn');
        if (turnLabel) {
            turnLabel.textContent = this.board.turn === 'w' ? "White's Turn" : "Black's Turn";
        }
    }
}

window.onload = () => {
    window.app = new GambitChessApp();
    window.app.init();
};
