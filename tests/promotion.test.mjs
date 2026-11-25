/**
 * Promotion flow regression test for ChessBoard (run with: node tests/promotion.test.mjs)
 * Verifies that the promotion dialog actually applies the chosen piece —
 * the dialog previously re-opened forever because makeMove re-intercepted itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const boardSrc = fs.readFileSync(path.join(__dirname, '..', 'app', 'static', 'js', 'board.js'), 'utf8');

// ---------- minimal DOM stubs ----------
function makeElement() {
    const el = {
        children: [],
        classList: {
            _set: new Set(),
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            contains(c) { return this._set.has(c); },
        },
        appendChild(child) { el.children.push(child); },
        getAttribute() { return null; },
        style: {},
        dataset: {},
        innerHTML: '',
        textContent: '',
        onclick: null,
    };
    return el;
}

const modal = makeElement();
const promoContainer = makeElement();

// The 4 dialog buttons, in the order the dialog builds them.
const promoButtons = ['q', 'r', 'b', 'n'].map(piece => ({
    ...makeElement(),
    getAttribute: (attr) => (attr === 'data-piece' ? piece : null),
}));

globalThis.window = globalThis;
globalThis.PIECE_SVGS = { Q: '<svg/>', R: '<svg/>', B: '<svg/>', N: '<svg/>', q: '<svg/>', r: '<svg/>', b: '<svg/>', n: '<svg/>' };
globalThis.document = {
    getElementById(id) {
        if (id === 'promotion-modal') return modal;
        if (id === 'promotion-choices') return promoContainer;
        return makeElement(); // board container etc.
    },
    createElement: () => makeElement(),
};
globalThis.window.sounds = {
    playMove() {}, playCapture() {}, playCheck() {}, playCastle() {}, muted: false,
};

// ---------- load ChessBoard class ----------
const sandboxFn = new Function(boardSrc + '\n;return ChessBoard;');
const ChessBoard = sandboxFn();

function freshBoard(fen) {
    const board = new ChessBoard('board');
    board.loadFen(fen);
    return board;
}

function squareIdx(algebraic) {
    return ChessBoard.algebraicToIndex(algebraic);
}

let failures = 0;
function check(cond, label) {
    if (cond) {
        console.log(`  ✅ ${label}`);
    } else {
        console.error(`  ❌ ${label}`);
        failures++;
    }
}

function runPromotionScenario(fen, fromAlg, toAlg, expectedColor) {
    const label = `${expectedColor === 'w' ? 'White' : 'Black'} pawn ${fromAlg}->${toAlg}`;
    console.log(`\n▶ Scenario: ${label} (fen: ${fen})`);

    // Force a fresh modal state
    modal.classList._set.clear();
    promoContainer.querySelectorAll = (sel) => (sel === '.promo-btn' ? promoButtons : []);

    for (const choice of ['q', 'r', 'b', 'n']) {
        const board = freshBoard(fen);
        const from = squareIdx(fromAlg);
        const to = squareIdx(toAlg);

        // 1. First click: should open the dialog, not move anything yet
        const first = board.makeMove(from, to);
        check(first === true, `[${choice}] makeMove returns true (dialog pending)`);
        check(board.pendingPromotion !== null, `[${choice}] pendingPromotion recorded`);
        check(modal.classList._set.has('active'), `[${choice}] dialog opened`);
        check(board.squares[from] === (expectedColor === 'w' ? 'P' : 'p'),
            `[${choice}] pawn still on ${fromAlg} before selection (move not applied yet)`);

        // 2. Click the dialog button for `choice`
        const btn = promoButtons.find(b => b.getAttribute('data-piece') === choice);
        check(typeof btn.onclick === 'function', `[${choice}] dialog button has click handler`);
        btn.onclick();

        check(board.pendingPromotion === null, `[${choice}] pendingPromotion cleared`);
        check(!modal.classList._set.has('active'), `[${choice}] dialog closed`);
        const placed = board.squares[to];
        check(placed === (expectedColor === 'w' ? choice.toUpperCase() : choice.toLowerCase()),
            `[${choice}] piece on ${toAlg} is "${placed}" (expected ${expectedColor === 'w' ? choice.toUpperCase() : choice.toLowerCase()})`);
        check(board.turn !== expectedColor, `[${choice}] turn switched`);
        check(!modal.classList._set.has('active'), `[${choice}] dialog did NOT re-open after choice`);
    }
}

// White promotion: a7-a8, plus capture-promotion b7xa8
runPromotionScenario('8/P7/8/8/8/8/8/k6K w - - 0 1', 'a7', 'a8', 'w');
runPromotionScenario('r3k3/1P6/8/8/8/8/8/7K w - - 0 1', 'b7', 'a8', 'w');
// Black promotion: a2-a1, plus capture-promotion a2xb1
runPromotionScenario('k6K/8/8/8/8/8/p7/8 b - - 0 1', 'a2', 'a1', 'b');
runPromotionScenario('7k/8/8/8/7K/8/p7/1R6 b - - 0 1', 'a2', 'b1', 'b');

console.log(failures === 0 ? '\n🎉 ALL PROMOTION TESTS PASSED' : `\n💥 ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
