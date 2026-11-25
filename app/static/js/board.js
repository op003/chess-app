/**
 * Interactive Chessboard Engine & Renderer (JavaScript).
 * Handles pieces, board orientation, click/drag, move validation,
 * legal square highlighting, promotion, and check states.
 */

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

class ChessBoard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.squares = new Array(64).fill(null);
        this.turn = 'w';
        this.castling = { K: true, Q: true, k: true, q: true };
        this.enPassant = null; // square index 0..63
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;

        this.flipped = false; // false = White on bottom
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.lastMove = null; // { from, to }
        this.checkSquare = null;
        this.bestMoveHighlight = null; // { from, to }
        this.allowedColor = null; // 'w', 'b', or null (any)
        this.isLocked = false;

        this.moveHistory = []; // list of { from, to, san, uci, piece, captured }
        this.pendingPromotion = null; // { from, to }

        this.onMoveCallback = null;
        this.loadFen(INITIAL_FEN);
    }

    // Convert file, rank to 0..63 index
    // file: 0..7 (a..h), rank: 0..7 (1..8)
    // 0 = a1, 7 = h1, 56 = a8, 63 = h8
    static coordsToIndex(file, rank) {
        return rank * 8 + file;
    }

    static indexToCoords(idx) {
        return { file: idx % 8, rank: Math.floor(idx / 8) };
    }

    static indexToAlgebraic(idx) {
        const f = String.fromCharCode(97 + (idx % 8));
        const r = (Math.floor(idx / 8) + 1).toString();
        return f + r;
    }

    static algebraicToIndex(alg) {
        if (!alg || alg.length < 2) return null;
        const file = alg.charCodeAt(0) - 97;
        const rank = parseInt(alg[1], 10) - 1;
        return rank * 8 + file;
    }

    loadFen(fen) {
        const parts = (fen || INITIAL_FEN).trim().split(/\s+/);
        const rows = parts[0].split('/');
        this.squares.fill(null);

        for (let r = 7; r >= 0; r--) {
            const rowStr = rows[7 - r] || '';
            let f = 0;
            for (let i = 0; i < rowStr.length; i++) {
                const char = rowStr[i];
                if (char >= '1' && char <= '8') {
                    f += parseInt(char, 10);
                } else {
                    const idx = ChessBoard.coordsToIndex(f, r);
                    this.squares[idx] = char;
                    f++;
                }
            }
        }

        this.turn = parts[1] || 'w';
        const castlingStr = parts[2] || '-';
        this.castling = {
            K: castlingStr.includes('K'),
            Q: castlingStr.includes('Q'),
            k: castlingStr.includes('k'),
            q: castlingStr.includes('q')
        };
        this.enPassant = parts[3] && parts[3] !== '-' ? ChessBoard.algebraicToIndex(parts[3]) : null;
        this.halfmoveClock = parseInt(parts[4], 10) || 0;
        this.fullmoveNumber = parseInt(parts[5], 10) || 1;

        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.pendingPromotion = null;

        this.updateCheckState();
        this.render();
    }

    getFen() {
        let fen = '';
        for (let r = 7; r >= 0; r--) {
            let emptyCount = 0;
            for (let f = 0; f < 8; f++) {
                const idx = ChessBoard.coordsToIndex(f, r);
                const p = this.squares[idx];
                if (!p) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += p;
                }
            }
            if (emptyCount > 0) fen += emptyCount;
            if (r > 0) fen += '/';
        }

        fen += ` ${this.turn} `;
        let c = '';
        if (this.castling.K) c += 'K';
        if (this.castling.Q) c += 'Q';
        if (this.castling.k) c += 'k';
        if (this.castling.q) c += 'q';
        fen += (c || '-') + ' ';

        fen += (this.enPassant !== null ? ChessBoard.indexToAlgebraic(this.enPassant) : '-') + ' ';
        fen += `${this.halfmoveClock} ${this.fullmoveNumber}`;
        return fen;
    }

    isWhitePiece(piece) {
        return piece && piece === piece.toUpperCase();
    }

    isBlackPiece(piece) {
        return piece && piece === piece.toLowerCase();
    }

    findKing(isWhite) {
        const target = isWhite ? 'K' : 'k';
        return this.squares.findIndex(p => p === target);
    }

    isSquareAttacked(targetIdx, byWhite) {
        const { file: tf, rank: tr } = ChessBoard.indexToCoords(targetIdx);

        // 1. Pawn attacks
        const pawnDir = byWhite ? 1 : -1;
        const pawnChar = byWhite ? 'P' : 'p';
        for (const df of [-1, 1]) {
            const pf = tf - df;
            const pr = tr - pawnDir;
            if (pf >= 0 && pf < 8 && pr >= 0 && pr < 8) {
                if (this.squares[ChessBoard.coordsToIndex(pf, pr)] === pawnChar) return true;
            }
        }

        // 2. Knight attacks
        const knightDeltas = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        const knightChar = byWhite ? 'N' : 'n';
        for (const [df, dr] of knightDeltas) {
            const f = tf + df;
            const r = tr + dr;
            if (f >= 0 && f < 8 && r >= 0 && r < 8) {
                if (this.squares[ChessBoard.coordsToIndex(f, r)] === knightChar) return true;
            }
        }

        // 3. Sliding rays (Bishops, Rooks, Queens)
        const straightDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        const rookChars = byWhite ? ['R', 'Q'] : ['r', 'q'];
        const bishopChars = byWhite ? ['B', 'Q'] : ['b', 'q'];

        for (const [df, dr] of straightDirs) {
            let f = tf + df, r = tr + dr;
            while (f >= 0 && f < 8 && r >= 0 && r < 8) {
                const p = this.squares[ChessBoard.coordsToIndex(f, r)];
                if (p) {
                    if (rookChars.includes(p)) return true;
                    break;
                }
                f += df; r += dr;
            }
        }

        for (const [df, dr] of diagDirs) {
            let f = tf + df, r = tr + dr;
            while (f >= 0 && f < 8 && r >= 0 && r < 8) {
                const p = this.squares[ChessBoard.coordsToIndex(f, r)];
                if (p) {
                    if (bishopChars.includes(p)) return true;
                    break;
                }
                f += df; r += dr;
            }
        }

        // 4. King attacks (adjacent squares)
        const kingChar = byWhite ? 'K' : 'k';
        for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
                if (df === 0 && dr === 0) continue;
                const f = tf + df, r = tr + dr;
                if (f >= 0 && f < 8 && r >= 0 && r < 8) {
                    if (this.squares[ChessBoard.coordsToIndex(f, r)] === kingChar) return true;
                }
            }
        }

        return false;
    }

    updateCheckState() {
        const isWhite = this.turn === 'w';
        const kingIdx = this.findKing(isWhite);
        if (kingIdx !== -1 && this.isSquareAttacked(kingIdx, !isWhite)) {
            this.checkSquare = kingIdx;
        } else {
            this.checkSquare = null;
        }
    }

    generatePseudoLegalMoves(fromIdx) {
        const piece = this.squares[fromIdx];
        if (!piece) return [];

        const isWhite = this.isWhitePiece(piece);
        const { file: f, rank: r } = ChessBoard.indexToCoords(fromIdx);
        const moves = [];

        const addMove = (toFile, toRank, flags = {}) => {
            if (toFile < 0 || toFile >= 8 || toRank < 0 || toRank >= 8) return false;
            const toIdx = ChessBoard.coordsToIndex(toFile, toRank);
            const target = this.squares[toIdx];

            if (!target) {
                moves.push({ from: fromIdx, to: toIdx, ...flags });
                return true; // continue ray
            } else {
                const targetIsWhite = this.isWhitePiece(target);
                if (targetIsWhite !== isWhite) {
                    moves.push({ from: fromIdx, to: toIdx, capture: true, ...flags });
                }
                return false; // hit piece, stop ray
            }
        };

        const type = piece.toUpperCase();

        if (type === 'P') {
            const dir = isWhite ? 1 : -1;
            const startRank = isWhite ? 1 : 6;
            const promoRank = isWhite ? 7 : 0;

            // 1 square forward
            const f1 = f, r1 = r + dir;
            if (r1 >= 0 && r1 < 8 && !this.squares[ChessBoard.coordsToIndex(f1, r1)]) {
                const isPromo = (r1 === promoRank);
                moves.push({ from: fromIdx, to: ChessBoard.coordsToIndex(f1, r1), promo: isPromo });

                // 2 squares forward from start rank
                const r2 = r + dir * 2;
                if (r === startRank && !this.squares[ChessBoard.coordsToIndex(f1, r2)]) {
                    moves.push({ from: fromIdx, to: ChessBoard.coordsToIndex(f1, r2), doublePawn: true });
                }
            }

            // Diagonal captures & En Passant
            for (const df of [-1, 1]) {
                const cf = f + df, cr = r + dir;
                if (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
                    const cIdx = ChessBoard.coordsToIndex(cf, cr);
                    const target = this.squares[cIdx];
                    const isPromo = (cr === promoRank);

                    if (target && this.isWhitePiece(target) !== isWhite) {
                        moves.push({ from: fromIdx, to: cIdx, capture: true, promo: isPromo });
                    } else if (cIdx === this.enPassant) {
                        moves.push({ from: fromIdx, to: cIdx, capture: true, enPassant: true });
                    }
                }
            }
        } else if (type === 'N') {
            const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            for (const [df, dr] of deltas) addMove(f + df, r + dr);
        } else if (type === 'B') {
            const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [df, dr] of dirs) {
                let curF = f + df, curR = r + dr;
                while (addMove(curF, curR)) { curF += df; curR += dr; }
            }
        } else if (type === 'R') {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [df, dr] of dirs) {
                let curF = f + df, curR = r + dr;
                while (addMove(curF, curR)) { curF += df; curR += dr; }
            }
        } else if (type === 'Q') {
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (const [df, dr] of dirs) {
                let curF = f + df, curR = r + dr;
                while (addMove(curF, curR)) { curF += df; curR += dr; }
            }
        } else if (type === 'K') {
            for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                    if (df !== 0 || dr !== 0) addMove(f + df, r + dr);
                }
            }

            // Castling
            if (isWhite && f === 4 && r === 0) {
                // Kingside
                if (this.castling.K && this.squares[7] === 'R' && !this.squares[5] && !this.squares[6] &&
                    !this.isSquareAttacked(4, false) && !this.isSquareAttacked(5, false) && !this.isSquareAttacked(6, false)) {
                    moves.push({ from: fromIdx, to: 6, castle: 'K' });
                }
                // Queenside
                if (this.castling.Q && this.squares[0] === 'R' && !this.squares[1] && !this.squares[2] && !this.squares[3] &&
                    !this.isSquareAttacked(4, false) && !this.isSquareAttacked(3, false) && !this.isSquareAttacked(2, false)) {
                    moves.push({ from: fromIdx, to: 2, castle: 'Q' });
                }
            } else if (!isWhite && f === 4 && r === 7) {
                // Kingside
                if (this.castling.k && this.squares[63] === 'r' && !this.squares[61] && !this.squares[62] &&
                    !this.isSquareAttacked(60, true) && !this.isSquareAttacked(61, true) && !this.isSquareAttacked(62, true)) {
                    moves.push({ from: fromIdx, to: 62, castle: 'k' });
                }
                // Queenside
                if (this.castling.q && this.squares[56] === 'r' && !this.squares[57] && !this.squares[58] && !this.squares[59] &&
                    !this.isSquareAttacked(60, true) && !this.isSquareAttacked(59, true) && !this.isSquareAttacked(58, true)) {
                    moves.push({ from: fromIdx, to: 58, castle: 'q' });
                }
            }
        }

        return moves;
    }

    getLegalMoves(fromIdx) {
        const piece = this.squares[fromIdx];
        if (!piece) return [];
        const isWhite = this.isWhitePiece(piece);
        if ((isWhite && this.turn !== 'w') || (!isWhite && this.turn !== 'b')) return [];

        const pseudoMoves = this.generatePseudoLegalMoves(fromIdx);
        const legalMoves = [];

        // Filter moves that leave king in check
        for (const m of pseudoMoves) {
            // Simulate move
            const savedFrom = this.squares[m.from];
            const savedTo = this.squares[m.to];
            const savedEp = this.enPassant;
            let epCaptured = null;
            let epSq = null;

            if (m.enPassant) {
                epSq = m.to + (isWhite ? -8 : 8);
                epCaptured = this.squares[epSq];
                this.squares[epSq] = null;
            }

            this.squares[m.to] = savedFrom;
            this.squares[m.from] = null;

            const kingIdx = this.findKing(isWhite);
            const inCheck = this.isSquareAttacked(kingIdx, !isWhite);

            // Revert
            this.squares[m.from] = savedFrom;
            this.squares[m.to] = savedTo;
            if (m.enPassant) {
                this.squares[epSq] = epCaptured;
            }

            if (!inCheck) {
                legalMoves.push(m);
            }
        }

        return legalMoves;
    }

    makeMove(fromIdx, toIdx, promotionChoice = null) {
        const piece = this.squares[fromIdx];
        if (!piece) return false;

        const legal = this.getLegalMoves(fromIdx);
        const move = legal.find(m => m.to === toIdx);
        if (!move) return false;

        // Check if promotion is required (only intercept on first call, not when replaying with a chosen piece)
        if (move.promo && promotionChoice === null) {
            this.pendingPromotion = { from: fromIdx, to: toIdx };
            this.showPromotionDialog(this.turn === 'w');
            return true;
        }

        const isWhite = this.isWhitePiece(piece);
        const capturedPiece = this.squares[toIdx];
        const effectiveCaptured = capturedPiece || (move.enPassant ? (isWhite ? 'p' : 'P') : null);
        const uci = ChessBoard.indexToAlgebraic(fromIdx) + ChessBoard.indexToAlgebraic(toIdx) + (move.promo ? promotionChoice.toLowerCase() : '');

        // Compute SAN before mutating board
        let san = uci;
        if (window.FastChessState) {
            try {
                const st = window.FastChessState.fromFen(this.getFen());
                const stMove = {
                    from: fromIdx,
                    to: toIdx,
                    capture: Boolean(effectiveCaptured),
                    enPassant: Boolean(move.enPassant),
                    castle: move.castle || null,
                    promo: move.promo ? promotionChoice.toLowerCase() : null,
                    doublePawn: Boolean(move.doublePawn),
                    uci
                };
                san = st.moveToSan(stMove);
            } catch (_) {}
        }

        // Move piece
        this.squares[toIdx] = piece;
        this.squares[fromIdx] = null;

        // Apply Promotion
        if (move.promo) {
            this.squares[toIdx] = isWhite ? promotionChoice.toUpperCase() : promotionChoice.toLowerCase();
        }

        // Apply En Passant Capture
        if (move.enPassant) {
            const epCapSq = toIdx + (isWhite ? -8 : 8);
            this.squares[epCapSq] = null;
        }

        // Apply Castling Rook Movement
        if (move.castle) {
            if (move.castle === 'K') { this.squares[5] = 'R'; this.squares[7] = null; }
            if (move.castle === 'Q') { this.squares[3] = 'R'; this.squares[0] = null; }
            if (move.castle === 'k') { this.squares[61] = 'r'; this.squares[63] = null; }
            if (move.castle === 'q') { this.squares[59] = 'r'; this.squares[56] = null; }
        }

        // Update En Passant square
        if (move.doublePawn) {
            this.enPassant = fromIdx + (isWhite ? 8 : -8);
        } else {
            this.enPassant = null;
        }

        // Update Castling rights
        if (piece === 'K') { this.castling.K = false; this.castling.Q = false; }
        if (piece === 'k') { this.castling.k = false; this.castling.q = false; }
        if (fromIdx === 0 || toIdx === 0) this.castling.Q = false;
        if (fromIdx === 7 || toIdx === 7) this.castling.K = false;
        if (fromIdx === 56 || toIdx === 56) this.castling.q = false;
        if (fromIdx === 63 || toIdx === 63) this.castling.k = false;

        // Update halfmove clock
        if (piece.toUpperCase() === 'P' || effectiveCaptured) {
            this.halfmoveClock = 0;
        } else {
            this.halfmoveClock++;
        }

        this.lastMove = { from: fromIdx, to: toIdx };

        // Toggle turn
        this.turn = (this.turn === 'w') ? 'b' : 'w';
        if (this.turn === 'w') this.fullmoveNumber++;

        this.updateCheckState();
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.render();

        // Audio trigger
        if (this.checkSquare !== null) {
            window.sounds.playCheck();
        } else if (move.castle) {
            window.sounds.playCastle();
        } else if (effectiveCaptured) {
            window.sounds.playCapture();
        } else {
            window.sounds.playMove();
        }

        if (this.onMoveCallback) {
            this.onMoveCallback({
                from: fromIdx,
                to: toIdx,
                uci: uci,
                san: san,
                fen: this.getFen(),
                captured: effectiveCaptured
            });
        }

        return true;
    }

    applyBotMoveUci(uci) {
        if (!uci || uci.length < 4) return false;
        const fromAlg = uci.substring(0, 2);
        const toAlg = uci.substring(2, 4);
        const promo = uci.length > 4 ? uci[4] : 'q';

        const fromIdx = ChessBoard.algebraicToIndex(fromAlg);
        const toIdx = ChessBoard.algebraicToIndex(toAlg);

        if (fromIdx === null || toIdx === null) return false;

        const piece = this.squares[fromIdx];
        if (!piece) return false;

        const isWhite = this.isWhitePiece(piece);
        const capturedPiece = this.squares[toIdx];
        const isEpCapture = (piece.toUpperCase() === 'P' && toIdx === this.enPassant);
        let isCastle = false;

        // Direct apply with full rules
        this.squares[toIdx] = piece;
        this.squares[fromIdx] = null;

        // Check promotion
        if (uci.length > 4) {
            this.squares[toIdx] = isWhite ? promo.toUpperCase() : promo.toLowerCase();
        }

        // Check castling
        if (piece.toUpperCase() === 'K') {
            if (fromIdx === 4 && toIdx === 6) { this.squares[5] = 'R'; this.squares[7] = null; isCastle = true; }
            if (fromIdx === 4 && toIdx === 2) { this.squares[3] = 'R'; this.squares[0] = null; isCastle = true; }
            if (fromIdx === 60 && toIdx === 62) { this.squares[61] = 'r'; this.squares[63] = null; isCastle = true; }
            if (fromIdx === 60 && toIdx === 58) { this.squares[59] = 'r'; this.squares[56] = null; isCastle = true; }
        }

        // Update en passant — handle capture and set new EP square for double pawn push
        if (isEpCapture) {
            const epSq = toIdx + (isWhite ? -8 : 8);
            this.squares[epSq] = null;
        }
        // Set en passant square for double pawn push
        const { rank: fromRank } = ChessBoard.indexToCoords(fromIdx);
        const { rank: toRank } = ChessBoard.indexToCoords(toIdx);
        if (piece.toUpperCase() === 'P' && Math.abs(toRank - fromRank) === 2) {
            this.enPassant = fromIdx + (isWhite ? 8 : -8);
        } else {
            this.enPassant = null;
        }

        // Update castling rights
        if (piece === 'K') { this.castling.K = false; this.castling.Q = false; }
        if (piece === 'k') { this.castling.k = false; this.castling.q = false; }
        if (fromIdx === 0 || toIdx === 0) this.castling.Q = false;
        if (fromIdx === 7 || toIdx === 7) this.castling.K = false;
        if (fromIdx === 56 || toIdx === 56) this.castling.q = false;
        if (fromIdx === 63 || toIdx === 63) this.castling.k = false;

        // Update halfmove clock and fullmove number
        if (piece.toUpperCase() === 'P' || capturedPiece || isEpCapture) {
            this.halfmoveClock = 0;
        } else {
            this.halfmoveClock++;
        }

        this.lastMove = { from: fromIdx, to: toIdx };
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.turn = (this.turn === 'w') ? 'b' : 'w';
        if (this.turn === 'w') this.fullmoveNumber++;
        this.updateCheckState();
        this.render();

        if (this.checkSquare !== null) {
            window.sounds.playCheck();
        } else if (isCastle) {
            window.sounds.playCastle();
        } else if (capturedPiece || isEpCapture) {
            window.sounds.playCapture();
        } else {
            window.sounds.playMove();
        }

        return true;
    }

    showPromotionDialog(isWhite) {
        const modal = document.getElementById('promotion-modal');
        const container = document.getElementById('promotion-choices');
        if (!modal || !container) return;

        const choices = ['q', 'r', 'b', 'n'];
        container.innerHTML = choices.map(c => `
            <button class="promo-btn" data-piece="${c}">
                ${PIECE_SVGS[isWhite ? c.toUpperCase() : c]}
            </button>
        `).join('');

        modal.classList.add('active');

        container.querySelectorAll('.promo-btn').forEach(btn => {
            btn.onclick = () => {
                const choice = btn.getAttribute('data-piece');
                modal.classList.remove('active');
                if (this.pendingPromotion) {
                    const { from, to } = this.pendingPromotion;
                    this.pendingPromotion = null;
                    this.makeMove(from, to, choice);
                }
            };
        });
    }

    handleSquareClick(idx) {
        if (this.isLocked) return;
        if (this.allowedColor && this.turn !== this.allowedColor) return;

        const piece = this.squares[idx];
        const isCurrentTurnPiece = piece && ((this.turn === 'w' && this.isWhitePiece(piece)) || (this.turn === 'b' && this.isBlackPiece(piece)));

        // If a square is already selected and user clicks one of its legal move targets
        if (this.selectedSquare !== null) {
            const isTarget = this.legalMovesForSelected.some(m => m.to === idx);
            if (isTarget) {
                this.makeMove(this.selectedSquare, idx);
                return;
            }
        }

        // Select piece
        if (isCurrentTurnPiece) {
            this.selectedSquare = idx;
            this.legalMovesForSelected = this.getLegalMoves(idx);
            this.render();
        } else {
            this.selectedSquare = null;
            this.legalMovesForSelected = [];
            this.render();
        }
    }

    flip() {
        this.flipped = !this.flipped;
        this.render();
    }

    setBestMoveHighlight(fromIdx, toIdx) {
        this.bestMoveHighlight = { from: fromIdx, to: toIdx };
    }

    clearBestMoveHighlight() {
        this.bestMoveHighlight = null;
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        const ranks = this.flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
        const files = this.flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

        const targetMap = new Map();
        for (const m of this.legalMovesForSelected) {
            targetMap.set(m.to, m.capture);
        }

        for (const r of ranks) {
            for (const f of files) {
                const idx = ChessBoard.coordsToIndex(f, r);
                const piece = this.squares[idx];
                const isLight = (f + r) % 2 !== 0;

                const sqEl = document.createElement('div');
                sqEl.className = `square ${isLight ? 'light' : 'dark'}`;
                sqEl.dataset.index = idx;

                // Highlighting
                if (this.selectedSquare === idx) {
                    sqEl.classList.add('selected');
                }
                if (this.lastMove && (this.lastMove.from === idx || this.lastMove.to === idx)) {
                    sqEl.classList.add('last-move');
                }
                if (this.checkSquare === idx) {
                    sqEl.classList.add('in-check');
                }
                if (this.bestMoveHighlight) {
                    if (this.bestMoveHighlight.from === idx) sqEl.classList.add('best-move-from');
                    if (this.bestMoveHighlight.to === idx) sqEl.classList.add('best-move-to');
                }

                // Legal move markers
                if (targetMap.has(idx)) {
                    const isCapture = targetMap.get(idx);
                    const marker = document.createElement('div');
                    marker.className = isCapture ? 'legal-capture-ring' : 'legal-move-dot';
                    sqEl.appendChild(marker);
                }

                // Render piece SVG
                if (piece && PIECE_SVGS[piece]) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = 'piece';
                    pieceEl.innerHTML = PIECE_SVGS[piece];
                    sqEl.appendChild(pieceEl);
                }

                // Coordinates label (on rank/file edges)
                if ((this.flipped && r === 7) || (!this.flipped && r === 0)) {
                    const fileLabel = document.createElement('span');
                    fileLabel.className = 'coord-file';
                    fileLabel.textContent = String.fromCharCode(97 + f);
                    sqEl.appendChild(fileLabel);
                }
                if ((this.flipped && f === 7) || (!this.flipped && f === 0)) {
                    const rankLabel = document.createElement('span');
                    rankLabel.className = 'coord-rank';
                    rankLabel.textContent = (r + 1).toString();
                    sqEl.appendChild(rankLabel);
                }

                sqEl.onclick = () => this.handleSquareClick(idx);
                this.container.appendChild(sqEl);
            }
        }
    }
}

window.ChessBoard = ChessBoard;
