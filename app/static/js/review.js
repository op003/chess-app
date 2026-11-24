/**
 * Interactive Game Review System for Gambit Master Chess.
 * Features:
 * - Full game analysis with accuracy scores (0-100%)
 * - Interactive Evaluation Graph with classification markers
 * - Move-by-move coaching with Best Move suggestions
 * - Next Key Move / Next Blunder navigation
 * - Board arrows and best move square highlights
 */

class GameReviewManager {
    constructor() {
        this.reviewData = null;
        this.currentPlyIdx = -1;
        this.canvas = null;
        this.ctx = null;
        this.isReviewing = false;
    }

    init() {
        const reviewModal = document.getElementById('review-modal');
        const openBtn = document.getElementById('btn-open-review');
        const openBottomBtn = document.getElementById('btn-review-game-bottom');
        const closeBtn = document.getElementById('btn-close-review');

        if (openBtn) {
            openBtn.onclick = () => this.startReview();
        }
        if (openBottomBtn) {
            openBottomBtn.onclick = () => this.startReview();
        }
        if (closeBtn) {
            closeBtn.onclick = () => {
                reviewModal.classList.remove('active');
                this.isReviewing = false;
                if (window.app && window.app.board) {
                    window.app.board.clearBestMoveHighlight();
                }
            };
        }

        // Stepper buttons – guard each in case DOM hasn't rendered yet
        const safeClick = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };
        safeClick('rev-btn-first', () => this.jumpToPly(0));
        safeClick('rev-btn-prev', () => this.jumpToPly(this.currentPlyIdx - 1));
        safeClick('rev-btn-next', () => this.jumpToPly(this.currentPlyIdx + 1));
        safeClick('rev-btn-last', () => {
            if (this.reviewData && this.reviewData.moves.length > 0) {
                this.jumpToPly(this.reviewData.moves.length - 1);
            }
        });
        safeClick('rev-btn-next-mistake', () => this.jumpToNextMistake());

        // Canvas setup for eval graph
        this.canvas = document.getElementById('review-eval-chart');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.canvas.onclick = (e) => this.handleCanvasClick(e);
        }
    }

    async startReview() {
        if (!window.app || !window.app.movesList || window.app.movesList.length === 0) {
            alert("No moves have been played in this game yet! Play some moves first.");
            return;
        }

        const reviewModal = document.getElementById('review-modal');
        const loadingEl = document.getElementById('review-loading');
        const contentEl = document.getElementById('review-content');

        reviewModal.classList.add('active');
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = `
            <div class="review-spinner"></div>
            <p>⏳ Analyzing ${window.app.movesList.length} moves at depth 2…</p>
        `;
        contentEl.style.display = 'none';

        // Abort after 90 s to avoid hanging indefinitely
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), 90000);

        try {
            const res = await fetch('/api/game/review', {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moves: window.app.movesList,
                    initial_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                    depth: 2
                })
            });
            clearTimeout(abortTimer);

            if (!res.ok) {
                let detail = "Please try again.";
                try { const err = await res.json(); detail = err.detail || detail; } catch (_) {}
                loadingEl.style.display = 'none';
                contentEl.innerHTML = `
                    <div style="color:#ef4444;padding:30px;text-align:center;">
                        <h3>❌ Analysis Failed</h3>
                        <p>${detail}</p>
                        <button class="btn btn-primary" onclick="window.gameReviewManager.startReview()" style="margin-top:12px;">
                            🔄 Retry
                        </button>
                    </div>`;
                contentEl.style.display = 'block';
                return;
            }

            this.reviewData = await res.json();
            this.isReviewing = true;

            loadingEl.style.display = 'none';
            contentEl.style.display = 'block';

            this.renderSummary();
            this.drawEvaluationChart();

            // Start review at ply 0 (or first turning point)
            const startPly = this.reviewData.summary.turning_point_ply >= 0
                ? this.reviewData.summary.turning_point_ply
                : 0;
            this.jumpToPly(startPly);

        } catch (e) {
            clearTimeout(abortTimer);
            console.error("Game review error:", e);
            loadingEl.style.display = 'none';
            const msg = e.name === 'AbortError'
                ? '⏱️ Analysis timed out (> 90 s). Try playing fewer moves or reload the page.'
                : `Unexpected error: ${e.message}`;
            contentEl.innerHTML = `
                <div style="color:#f59e0b;padding:30px;text-align:center;">
                    <h3>⚠️ Review Error</h3>
                    <p>${msg}</p>
                    <button class="btn btn-primary" onclick="window.gameReviewManager.startReview()" style="margin-top:12px;">
                        🔄 Retry
                    </button>
                </div>`;
            contentEl.style.display = 'block';
        }
    }

    renderSummary() {
        const sum = this.reviewData.summary;

        // Accuracy Percentages
        document.getElementById('rev-white-acc').textContent = `${sum.white_accuracy}%`;
        document.getElementById('rev-black-acc').textContent = `${sum.black_accuracy}%`;

        const wBar = document.getElementById('rev-white-acc-bar');
        const bBar = document.getElementById('rev-black-acc-bar');
        if (wBar) wBar.style.width = `${sum.white_accuracy}%`;
        if (bBar) bBar.style.width = `${sum.black_accuracy}%`;

        // Classification Breakdown Grid
        const breakdownBody = document.getElementById('rev-breakdown-body');
        if (!breakdownBody) return;

        const categories = [
            { key: 'brilliant', label: 'Brilliant', badge: '💎 !!', color: '#06b6d4' },
            { key: 'best', label: 'Best Move', badge: '⭐ ★', color: '#10b981' },
            { key: 'excellent', label: 'Excellent', badge: '✨', color: '#34d399' },
            { key: 'good', label: 'Good', badge: '👍', color: '#94a3b8' },
            { key: 'book', label: 'Book Move', badge: '📖', color: '#38bdf8' },
            { key: 'inaccuracy', label: 'Inaccuracy', badge: '⚠️ ?!', color: '#f59e0b' },
            { key: 'mistake', label: 'Mistake', badge: '❓ ?', color: '#f97316' },
            { key: 'blunder', label: 'Blunder', badge: '❌ ??', color: '#ef4444' }
        ];

        breakdownBody.innerHTML = categories.map(cat => {
            const wVal = sum.white_counts[cat.key] || 0;
            const bVal = sum.black_counts[cat.key] || 0;
            return `
                <div class="rev-stat-row">
                    <span class="rev-stat-w">${wVal}</span>
                    <span class="rev-stat-badge" style="background:${cat.color}20; color:${cat.color}; border:1px solid ${cat.color}50;">
                        ${cat.badge} ${cat.label}
                    </span>
                    <span class="rev-stat-b">${bVal}</span>
                </div>
            `;
        }).join('');
    }

    drawEvaluationChart() {
        if (!this.canvas || !this.ctx || !this.reviewData) return;
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const centerY = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Center Baseline (0.00 eval)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        const history = this.reviewData.eval_history;
        if (!history || history.length < 2) return;

        const maxPawns = 6.0; // clamp chart at +6 to -6 pawns
        const stepX = w / (history.length - 1);

        const getY = (cp) => {
            const pawns = Math.max(-maxPawns, Math.min(maxPawns, cp / 100.0));
            // positive cp (White winning) moves UP (-), negative moves DOWN (+)
            return centerY - (pawns / maxPawns) * (centerY - 10);
        };

        // Draw Area Fill
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        history.forEach((cp, i) => {
            ctx.lineTo(i * stepX, getY(cp));
        });
        ctx.lineTo((history.length - 1) * stepX, centerY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)'); // White advantage (green)
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.25)'); // Black advantage (red)
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw Evaluation Line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        history.forEach((cp, i) => {
            const x = i * stepX;
            const y = getY(cp);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Move Classification Markers
        this.reviewData.moves.forEach((m, idx) => {
            const x = (idx + 1) * stepX;
            const y = getY(m.eval_white_cp);

            let markerColor = '#94a3b8';
            let radius = 3;

            if (m.classification === 'brilliant') {
                markerColor = '#06b6d4';
                radius = 5.5;
            } else if (m.classification === 'blunder') {
                markerColor = '#ef4444';
                radius = 5.5;
            } else if (m.classification === 'mistake') {
                markerColor = '#f97316';
                radius = 4.5;
            } else if (m.classification === 'inaccuracy') {
                markerColor = '#f59e0b';
                radius = 4;
            } else if (m.classification === 'best') {
                markerColor = '#10b981';
                radius = 3.5;
            }

            ctx.fillStyle = markerColor;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // Highlight current reviewed ply
            if (idx === this.currentPlyIdx) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
    }

    handleCanvasClick(e) {
        if (!this.reviewData || !this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const total = this.reviewData.moves.length;
        if (total === 0) return;

        const stepX = rect.width / total;
        const ply = Math.max(0, Math.min(total - 1, Math.round(clickX / stepX) - 1));
        this.jumpToPly(ply);
    }

    jumpToPly(plyIdx) {
        if (!this.reviewData || this.reviewData.moves.length === 0) return;
        this.currentPlyIdx = Math.max(0, Math.min(this.reviewData.moves.length - 1, plyIdx));
        const move = this.reviewData.moves[this.currentPlyIdx];

        // 1. Update board position to this ply's FEN
        if (window.app && window.app.board) {
            window.app.board.loadFen(move.fen_after);

            // Highlight played move on the board
            const fromIdx = ChessBoard.algebraicToIndex(move.uci.substring(0, 2));
            const toIdx = ChessBoard.algebraicToIndex(move.uci.substring(2, 4));
            window.app.board.lastMove = { from: fromIdx, to: toIdx };

            // Highlight best move suggestion if move was inaccurate / blunder
            if (['inaccuracy', 'mistake', 'blunder'].includes(move.classification)) {
                const bestFrom = ChessBoard.algebraicToIndex(move.best_uci.substring(0, 2));
                const bestTo = ChessBoard.algebraicToIndex(move.best_uci.substring(2, 4));
                window.app.board.setBestMoveHighlight(bestFrom, bestTo);
            } else {
                window.app.board.clearBestMoveHighlight();
            }
            window.app.board.render();
        }

        // 2. Render Review Card
        const cardEl = document.getElementById('rev-move-card');
        const badgeClasses = {
            'brilliant': { label: '💎 Brilliant !!', cls: 'badge-brilliant' },
            'best': { label: '⭐ Best Move', cls: 'badge-best' },
            'excellent': { label: '✨ Excellent', cls: 'badge-excellent' },
            'good': { label: '👍 Good', cls: 'badge-good' },
            'book': { label: '📖 Book Move', cls: 'badge-book' },
            'inaccuracy': { label: '⚠️ Inaccuracy ?!', cls: 'badge-inaccuracy' },
            'mistake': { label: '❓ Mistake ?', cls: 'badge-mistake' },
            'blunder': { label: '❌ Blunder ??', cls: 'badge-blunder' }
        };

        const badgeInfo = badgeClasses[move.classification] || badgeClasses['good'];
        const isWhite = (move.color === 'white');

        cardEl.innerHTML = `
            <div class="rev-card-header">
                <span class="rev-move-title">
                    Move ${move.move_number} • ${isWhite ? 'White' : 'Black'} played <strong>${move.san}</strong>
                </span>
                <span class="rev-badge ${badgeInfo.cls}">${badgeInfo.label}</span>
            </div>

            <div class="rev-eval-row">
                <span>Evaluation: <strong>${move.eval_white_pawns > 0 ? '+' : ''}${move.eval_white_pawns}</strong></span>
                <span>Accuracy: <strong>${move.accuracy}%</strong></span>
                ${move.delta_cp > 20 ? `<span class="rev-lost-eval">-${(move.delta_cp / 100).toFixed(1)} pawns</span>` : ''}
            </div>

            <p class="rev-explanation">${move.explanation}</p>

            ${move.best_uci !== move.uci ? `
                <div class="rev-suggestion-box">
                    <span class="rev-best-label">⭐ Engine's Recommended Move:</span>
                    <strong class="rev-best-move">${move.best_san} (${move.best_uci})</strong>
                </div>
            ` : ''}
        `;

        // 3. Re-draw chart to update cursor
        this.drawEvaluationChart();
    }

    jumpToNextMistake() {
        if (!this.reviewData) return;
        const moves = this.reviewData.moves;
        for (let i = this.currentPlyIdx + 1; i < moves.length; i++) {
            if (['inaccuracy', 'mistake', 'blunder'].includes(moves[i].classification)) {
                this.jumpToPly(i);
                return;
            }
        }
        // Wrap around
        for (let i = 0; i <= this.currentPlyIdx; i++) {
            if (['inaccuracy', 'mistake', 'blunder'].includes(moves[i].classification)) {
                this.jumpToPly(i);
                return;
            }
        }
    }
}

window.gameReviewManager = new GameReviewManager();
