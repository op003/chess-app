/**
 * Game-over overlay test (run with: node tests/gameover.test.mjs)
 * Simulates: Fool's mate against the bot (user should WIN), and mirror loss.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'static', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script>\n([\s\S]*?)\n\s*<\/script>/g)].map(m => m[1]);
const mainJs = blocks[1]; // offline engine = block 0, main app = block 1

// ---------- DOM stubs ----------
function makeElement() {
    const el = {
        children: [], classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
        appendChild(c) { el.children.push(c); },
        getAttribute() { return null; }, style: {}, dataset: {},
        innerHTML: '', textContent: '', onclick: null, value: '',
    };
    return el;
}
const elements = {};
function el(id) {
    if (!elements[id]) elements[id] = makeElement();
    return elements[id];
}
globalThis.window = globalThis;
globalThis.PIECE_SVGS = new Proxy({}, { get: () => '<svg/>' });
globalThis.document = {
    getElementById: (id) => el(id),
    createElement: () => makeElement(),
    body: makeElement(),
};
globalThis.window.sounds = { playMove() {}, playCapture() {}, playCheck() {}, playCastle() {}, playVictory() {}, muted: false };
try { globalThis.navigator = { clipboard: { writeText() {} } }; } catch (_) { /* node has read-only navigator */ }
globalThis.alert = () => {};
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });

// Build the ChessBoard class from the main script (it's defined inline)
new Function(mainJs + '\n;return { ChessBoard, GambitChessApp };')();
const ChessBoard = globalThis.ChessBoard;

let failures = 0;
function check(cond, label) {
    if (cond) console.log(`  ✅ ${label}`);
    else { console.error(`  ❌ ${label}`); failures++; }
}

// Use a real board and drive checkGameOver logic via an app-like shim
const board = new ChessBoard('board');

const app = {
    board,
    userColor: 'w',
    movesList: [],
    sanMovesList: [],
    capturedByWhite: [],
    capturedByBlack: [],
    _gameOverShown: false,
    setBotSpeech() {},
    startNewGame(color) {
        this.userColor = color;
        this.movesList = []; this.sanMovesList = [];
        this.capturedByWhite = []; this.capturedByBlack = [];
        this._gameOverShown = false;
        board.loadFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    },
};

// pull checkGameOver/showGameOver from the class prototype by attaching them
const protoFns = {};
{
    const checkSrc = mainJs.match(/    checkGameOver\(\) \{[\s\S]*?\n    \}\n/)[0];
    const showSrc = mainJs.match(/    showGameOver\(icon, title, subtitleHtml\) \{[\s\S]*?\n    \}\n/)[0];
    const build = (src, name) => new Function(`return function ${name}(${src.slice(src.indexOf('(') + 1, src.indexOf(')'))} ${''})${src.slice(src.indexOf(')') + 1)}`);
    // simpler: evaluate method bodies in app context
    app.checkGameOver = new Function('return function checkGameOver() {' + checkSrc.slice(checkSrc.indexOf('{') + 1, checkSrc.lastIndexOf('}')) + '}')();
    app.showGameOver = new Function('return function showGameOver(icon, title, subtitleHtml) {' + showSrc.slice(showSrc.indexOf('{') + 1, showSrc.lastIndexOf('}')) + '}')();
}

// Scenario 1: Fool's mate — user plays white and gets checkmated => overlay shows LOSS
app.startNewGame('w');
for (const uci of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) {
    board.applyBotMoveUci(uci);
    app.movesList.push(uci);
}
const gameOver1 = app.checkGameOver();
check(gameOver1 === true, "checkGameOver detects fool's mate");
check(el('game-over-overlay').classList._s.has('active'), 'overlay is visible after checkmate');
check(el('game-over-icon').textContent === '🏆', 'icon is trophy');
check(el('game-over-subtitle').innerHTML.includes('lose-text'), 'subtitle marks the loss (user played white and got mated)');
// repeated calls must not double-trigger
app.checkGameOver();
check(el('game-over-subtitle').innerHTML.split('lose-text').length === 2, 'overlay content not re-written (guarded)');

// Close button handler was assigned
check(typeof el('game-over-close').onclick === 'function', 'close button wired');
el('game-over-close').onclick();
check(!el('game-over-overlay').classList._s.has('active'), 'close hides overlay');

// Rematch handler resets
check(typeof el('game-over-rematch').onclick === 'function', 'rematch button wired');
el('game-over-rematch').onclick();
check(app._gameOverShown === false, 'rematch re-arms overlay');
check(!el('game-over-overlay').classList._s.has('active'), 'overlay hidden on rematch');

// Scenario 2: user (as black this time) delivers mate => WIN
app.startNewGame('b');
for (const uci of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) {
    board.applyBotMoveUci(uci);
    app.movesList.push(uci);
}
app.checkGameOver();
check(el('game-over-subtitle').innerHTML.includes('win-text'), 'subtitle marks the win (user played black)');

// Scenario 3: 50-move rule draw
app.startNewGame('w');
board.halfmoveClock = 100;
const result3 = app.checkGameOver();
check(result3 === true || !el('game-over-overlay').classList._s.has('active') || el('game-over-icon').textContent === '🤝',
    '50-move draw path does not crash (result3=' + result3 + ')');

console.log(failures === 0 ? '\n🎉 ALL GAME-OVER TESTS PASSED' : `\n💥 ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
