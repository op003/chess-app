/**
 * Offline engine fallback tests (run with: node tests/offline_fallback.test.mjs)
 * Verifies the embedded JS engine (offline_engine.js) mirrors the Python API so
 * static deployments (Vercel etc.) keep a working bot, gambits, review & training.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'static', 'js', 'offline_engine.js'), 'utf8');

globalThis.window = globalThis;

let failures = 0;
function check(cond, label) {
    if (cond) console.log(`  ✅ ${label}`);
    else { console.error(`  ❌ ${label}`); failures++; }
}

// Load the offline engine (defines FastChessState + window.offlineEngine)
new Function(src + '\n;return window;')();
const engine = globalThis.offlineEngine;
check(typeof engine === 'object' && engine !== null, 'window.offlineEngine exists');

// --- personalities (must include the new Alien Gambit) ---
const personalities = engine.getPersonalities();
const ids = personalities.map(p => p.id);
check(ids.includes('alien_gambit'), `roster includes alien_gambit (got: ${ids.join(', ')})`);
check(ids.includes('trained'), 'roster includes trained');
const alien = personalities.find(p => p.id === 'alien_gambit');
check(alien.weights.gambit_aggression === 3.0, 'alien personality keeps its 300% aggression');
check(alien.weights.king_safety_weight === 5.0, 'alien weights include the king_safety term');

// --- gambits ---
const gambits = engine.getGambits();
check(gambits.some(g => g.id === 'alien_gambit'), 'gambit DB includes alien_gambit');
const alienBook = engine.findGambitContinuation(
    ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'g8f6', 'e4g5', 'h7h6'], 'alien_gambit');
check(alienBook && alienBook.uci === 'g5f7', `book continuation after 5...h6 is Nxf7 (got ${alienBook && alienBook.uci})`);

// --- chooseMove: legal move from the start position ---
const t0 = Date.now();
const res = engine.chooseMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [], 'alien_gambit', 'alien_gambit', 2);
check(res && res.move && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(res.move), `chooseMove returns UCI move (${res && res.move}, ${Date.now() - t0}ms)`);
check(typeof res.comment === 'string' && res.comment.length > 0, 'chooseMove includes commentary');

// chooseMove for the alien main line right before the sacrifice
// (1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Ng5 h6 — Ng5 ready to jump to f7)
const resSac = engine.chooseMove(
    'rnbqkb1r/ppp2ppp/2p4p/6N1/3P4/8/PPPP1PPP/R1BQKB1R w KQkq - 0 6',
    ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'g8f6', 'e4g5', 'h7h6'],
    'alien_gambit', 'alien_gambit', 2);
check(resSac && resSac.move === 'g5f7', `alien bot plays the brilliant Nxf7! in the book line (got ${resSac && resSac.move})`);

// --- evaluatePosition ---
const ev = engine.evaluatePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'tal');
check(typeof ev.eval_cp === 'number', 'evaluatePosition returns numeric eval_cp');
check(ev.turn === 'white', 'evaluatePosition reports turn');

// --- reviewGame shape matches the server report ---
const report = engine.reviewGame(['e2e4', 'e7e5', 'g1f3', 'b8c6']);
check(report && report.summary && Array.isArray(report.moves) && Array.isArray(report.eval_history),
    'reviewGame returns {summary, moves, eval_history}');
check(report.moves.length === 4, 'review classified all 4 moves');
check(typeof report.summary.white_accuracy === 'number', 'summary has white_accuracy');

// --- quick offline training run ---
(async () => {
    const trained = await engine.trainEvolutionary({ generations: 1, depth: 1, personality: 'tal' }, null, null);
    check(trained && trained.name, 'offline training returns champion weights');
    const stored = engine.getTrainedWeights();
    check(stored && JSON.stringify(stored) === JSON.stringify(trained), 'trained weights persisted in engine storage');

    console.log(failures === 0 ? '\n🎉 ALL OFFLINE FALLBACK TESTS PASSED' : `\n💥 ${failures} FAILURES`);
    process.exit(failures === 0 ? 0 : 1);
})();
