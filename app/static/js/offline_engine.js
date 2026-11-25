/**
 * Self-contained Client-Side Chess Engine, Gambit Book, Evaluator, Trainer & Reviewer.
 * Acts as a seamless fallback when the Python FastAPI backend is unreachable
 * (e.g., opening index.html directly or hosting on a static website), and provides
 * instant SAN notation and local weight persistence.
 */

const FALLBACK_GAMBITS = [
    {
        id: "kings_gambit", name: "King's Gambit", color: "white", eco: "C30-C39",
        subtitle: "The Romantic Immortal Classic",
        moves: ["e2e4", "e7e5", "f2f4"],
        san_moves: ["1. e4", "e5", "2. f4"],
        description: "One of the oldest and most romantic openings. White immediately offers the f-pawn on move 2 to deflect Black's e5 pawn, seize the center with d4, and open the f-file for kingside attack.",
        key_ideas: ["Deflect Black's central e5 pawn", "Build a massive pawn center with d2-d4", "Open the f-file for the White rook after castling", "Target Black's weak f7 square with Bc4"],
        variations: [
            { name: "Accepted - Kieseritzky Gambit", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5", "h2h4", "g5g4", "f3e5"], note: "Sharpest line against Black's pawn chain g5." },
            { name: "Accepted - Modern Cunningham Defense", moves: ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "f8e7", "f1c4", "e7h4", "e1f1"], note: "White accepts king displacement for massive development." },
            { name: "Declined - Falkbeer Countergambit", moves: ["e2e4", "e7e5", "f2f4", "d7d5", "e4d5", "e5e4"], note: "Black fights for central initiative by sacrificing d5." }
        ],
        trap_example: "Muzio Gambit piece sacrifice leading to lightning checkmates on f7."
    },
    {
        id: "queens_gambit", name: "Queen's Gambit", color: "white", eco: "D06-D69",
        subtitle: "The Championship Powerhouse",
        moves: ["d2d4", "d7d5", "c2c4"],
        san_moves: ["1. d4", "d5", "2. c4"],
        description: "The most prestigious gambit in chess history. White sacrifices a wing pawn (c4) to dismantle Black's center and gain spatial dominance.",
        key_ideas: ["Exchange a flank pawn for Black's central d5 pawn", "Establish two pawns in the center with e2-e4", "Apply queenside pressure down the c-file", "Rapid minor piece development to active squares"],
        variations: [
            { name: "Accepted (QGA)", moves: ["d2d4", "d7d5", "c2c4", "d5c4", "g1f3", "g8f6", "e2e3", "e7e6", "f1c4"], note: "White regains the pawn with tempo and strong center." },
            { name: "Declined - Orthodox (QGD)", moves: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7"], note: "The rock-solid classical defense." },
            { name: "Slav Defense", moves: ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3", "d5c4"], note: "Solid pawn triangle supporting d5." }
        ],
        trap_example: "Elephant Trap in Queen's Gambit Declined."
    },
    {
        id: "evans_gambit", name: "Evans Gambit", color: "white", eco: "C51-C52",
        subtitle: "Morphy & Kasparov's Lethal Weapon",
        moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4"],
        san_moves: ["1. e4", "e5", "2. Nf3", "Nc6", "3. Bc4", "Bc5", "4. b4"],
        description: "White offers the b-pawn to gain tempos with c3 and d4, dominating the center and opening deadly diagonal attacks on the Black king.",
        key_ideas: ["Sacrifice b4 pawn to deflect Black's dark-square bishop", "Play c2-c3 with tempo on the bishop", "Push d2-d4 to erect an imposing center", "Deploy Queen to b3 or Ba3 to paralyze Black's king"],
        variations: [
            { name: "Accepted - Main Line", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4", "c5b4", "c2c3", "b4a5", "d2d4", "e5d4", "e1g1"], note: "Compromised Defense with rapid open file threats." },
            { name: "Declined", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4", "c5b6", "a2a4", "a7a6"], note: "White claims space on the queenside." }
        ],
        trap_example: "Quick mate on f7 when Black wastes time holding the b4 pawn."
    },
    {
        id: "danish_gambit", name: "Danish Gambit", color: "white", eco: "C21",
        subtitle: "The Double Pawn Bishop Laser",
        moves: ["e2e4", "e7e5", "d2d4", "e5d4", "c2c3", "d4c3", "f1c4", "c3b2", "c1b2"],
        san_moves: ["1. e4", "e5", "2. d4", "exd4", "3. c3", "dxc3", "4. Bc4", "cxb2", "5. Bxb2"],
        description: "White boldly gives up TWO whole pawns to position both bishops on razor-sharp diagonals slicing directly toward Black's uncastled kingside.",
        key_ideas: ["Give up two pawns to maximize development speed", "Two monster bishops pointing at g7 and f7", "Total domination of central files and open diagonals", "Crush Black before they can organize defense"],
        variations: [
            { name: "Schlechter Defense", moves: ["e2e4", "e7e5", "d2d4", "e5d4", "c2c3", "d4c3", "f1c4", "c3b2", "c1b2", "d7d5", "c4d5", "g8f6"], note: "Black returns a pawn to neutralize the attack." }
        ],
        trap_example: "Immediate Bxf7+ king decoying tactics."
    },
    {
        id: "vienna_gambit", name: "Vienna Gambit", color: "white", eco: "C29",
        subtitle: "The Steinitz Heavyweight Strike",
        moves: ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4"],
        san_moves: ["1. e4", "e5", "2. Nc3", "Nf6", "3. f4"],
        description: "An improved version of the King's Gambit. By developing Nc3 first, White prevents Black's queen check on h4 and prepares an immediate central explosion.",
        key_ideas: ["Stop Black's Qh4+ counterattacks", "Strike at Black's e5 pawn with f4", "Prepare e4-e5 pushing Black's f6 knight away", "Create powerful kingside attacking chances"],
        variations: [
            { name: "Main Line 3... d5", moves: ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4", "d7d5", "f4e5", "f6e4", "d1f3"], note: "Sharpest tactical counter-blow." },
            { name: "Accepted 3... exf4?!", moves: ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4", "e5f4", "e4e5", "d8e7", "d1e2"], note: "White traps or pushes back Black's knight immediately." }
        ],
        trap_example: "3... exf4 4. e5 traps the knight or forces an ugly queen block."
    },
    {
        id: "smith_morra", name: "Smith-Morra Gambit", color: "white", eco: "B21",
        subtitle: "The Sicilian Destroyer",
        moves: ["e2e4", "c7c5", "d2d4", "c5d4", "c2c3", "d4c3", "b1c3"],
        san_moves: ["1. e4", "c5", "2. d4", "cxd4", "3. c3", "dxc3", "4. Nxc3"],
        description: "White's favorite aggressive weapon against the Sicilian Defense. White gives up a pawn on move 3 to tear open the c and d files for rooks and rapidly mobilize all pieces.",
        key_ideas: ["Tear open the c and d files for heavy pieces", "Station bishops aggressively on c4 and f4/g5", "Target weak d6 pawn and d5 outpost", "Overwhelm Black's slow king safety"],
        variations: [
            { name: "Classical Defense", moves: ["e2e4", "c7c5", "d2d4", "c5d4", "c2c3", "d4c3", "b1c3", "b8c6", "g1f3", "d7d6", "f1c4", "e7e6", "e1g1", "g8f6", "d1e2"], note: "White sets up Rd1 and e4-e5 break." }
        ],
        trap_example: "Bxf7+ followed by Ng5+ or Nd5 checkmating traps."
    },
    {
        id: "scotch_gambit", name: "Scotch Gambit", color: "white", eco: "C44",
        subtitle: "Rapid Central Strike",
        moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f1c4"],
        san_moves: ["1. e4", "e5", "2. Nf3", "Nc6", "3. d4", "exd4", "4. Bc4"],
        description: "White refuses to immediately recapture the d4 pawn, instead deploying the bishop to c4 targeting f7 and creating immediate attacking tension.",
        key_ideas: ["Quick development of Bc4 aimed at f7", "Prepare c2-c3 or 0-0 followed by Re1", "Pin Black's knights and challenge center"],
        variations: [
            { name: "4... Nf6 Line", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f1c4", "g8f6", "e4e5", "d7d5", "c4b5", "f6e4", "f3d4"], note: "Dynamic struggle in the center." }
        ],
        trap_example: "Ng5 attacking f7 when Black plays prematurely."
    },
    {
        id: "blackmar_diemer", name: "Blackmar-Diemer Gambit", color: "white", eco: "D00",
        subtitle: "The Hyper-Aggressive 1.d4 Gambit",
        moves: ["d2d4", "d7d5", "e2e4", "d5e4", "b1c3", "g8f6", "f2f3", "e4f3", "g1f3"],
        san_moves: ["1. d4", "d5", "2. e4", "dxe4", "3. Nc3", "Nf6", "4. f3", "exf3", "5. Nxf3"],
        description: "Transforms a quiet d4 opening into a wild tactical bloodbath! White offers a pawn on f3 to unleash bishops and rooks down the open e and f files.",
        key_ideas: ["Tear open the f-file for the kingside rook", "Supercharge bishop diagonals on c4 and g5", "Castling queenside (0-0-0) to add d-file rook pressure"],
        variations: [
            { name: "Euwe Defense", moves: ["d2d4", "d7d5", "e2e4", "d5e4", "b1c3", "g8f6", "f2f3", "e4f3", "g1f3", "e7e6", "f1d3", "f8e7"], note: "Black seeks solid shelter." }
        ],
        trap_example: "Halosar Trap: White mates or wins Queen in 8 moves."
    },
    {
        id: "halloween_gambit", name: "Halloween Gambit", color: "white", eco: "C47",
        subtitle: "The Shocking Knight Sacrifice",
        moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "f3e5"],
        san_moves: ["1. e4", "e5", "2. Nf3", "Nc6", "3. Nc3", "Nf6", "4. Nxe5!?"],
        description: "White plays a speculative sacrifice of a full minor piece on move 4! White's goal is to seize the complete center with d4 and e5, chasing Black's knights into awkward passive squares.",
        key_ideas: ["Sacrifice knight on e5 to push d4 and e5", "Chase Black's knights back to the rim", "Choke Black's development with massive central space"],
        variations: [
            { name: "Main Line", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "f3e5", "c6e5", "d2d4", "e5g6", "e4e5", "f6g8", "f1c4"], note: "White controls everything while Black's pieces retreat." }
        ],
        trap_example: "Black's king gets caught in center under raging pawn storm."
    },
    {
        id: "stafford_gambit", name: "Stafford Gambit", color: "black", eco: "C42",
        subtitle: "The Viral Tactical Ambush",
        moves: ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6", "e5c6", "d7c6"],
        san_moves: ["1. e4", "e5", "2. Nf3", "Nf6", "3. Nxe5", "Nc6", "4. Nxc6", "dxc6"],
        description: "Popularized by IM Eric Rosen. Black sacrifices a pawn on move 3 in the Petroff Defense to blow open diagonal lines for both bishops and the queen, setting dozens of deadly mating traps.",
        key_ideas: ["Open d-file and c8-h3 diagonal with dxc6", "Deploy Bc5 pointing straight at White's f2 square", "Jump Ng4 to coordinate with Qh4 for checkmate attacks", "Devastating traps if White plays routine developing moves"],
        variations: [
            { name: "5. d3 Bc5 6. Bg5? Trap Line", moves: ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6", "e5c6", "d7c6", "d2d3", "f8c5", "c1g5", "f6e4", "g5d8", "c5f2", "e1e2", "c8g4"], note: "Classic smothered/double-check checkmate on move 8!" },
            { name: "5. e5 Ne4 6. d3 Bc5", moves: ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6", "e5c6", "d7c6", "e4e5", "f6e4", "d2d4", "d8h4"], note: "Direct assault on White's f2 vulnerability." }
        ],
        trap_example: "The legendary 8-move queen sacrifice checkmate (Nxe4!!)."
    },
    {
        id: "budapest_gambit", name: "Budapest Gambit", color: "black", eco: "A51-A52",
        subtitle: "The Sharp Counterpunch Against 1.d4",
        moves: ["d2d4", "g8f6", "c2c4", "e7e5", "d4e5", "f6g4"],
        san_moves: ["1. d4", "Nf6", "2. c4", "e5", "3. dxe5", "Ng4"],
        description: "Black immediately challenges White's 1.d4 dominance by sacrificing the e-pawn. The knight on g4, joined by Nc6 and Qe7/Bc5, relentlessly hammers White's overextended e5 pawn.",
        key_ideas: ["Target the e5 weakness with Ng4, Nc6, and Qe7", "Exploit the open diagonal with Bc5", "Set up smothered mate threats on d3"],
        variations: [
            { name: "Adler Variation", moves: ["d2d4", "g8f6", "c2c4", "e7e5", "d4e5", "f6g4", "g1f3", "f8c5", "e2e3", "b8c6"], note: "Pressure builds on e5." }
        ],
        trap_example: "Nd3# smothered checkmate against White's queen."
    },
    {
        id: "benko_gambit", name: "Benko Gambit", color: "black", eco: "A57-A59",
        subtitle: "Positional Masterpiece of Perpetual Pressure",
        moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5", "c4b5", "a7a6", "b5a6", "c8a6"],
        san_moves: ["1. d4", "Nf6", "2. c4", "c5", "3. d5", "b5", "4. cxb5", "a6", "5. bxa6", "Bxa6"],
        description: "Unlike tactical gambits that fade, the Benko gives Black durable, permanent positional pressure along the semi-open a- and b-files throughout the entire game.",
        key_ideas: ["Dominate queenside open a- and b-files with rooks", "Fianchetto bishop on g7 slicing across the board", "Tie down White's pieces to defensive duty"],
        variations: [
            { name: "Accepted - King Walk", moves: ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5", "c4b5", "a7a6", "b5a6", "c8a6", "b1c3", "d7d6", "e2e4", "a6f1", "e1f1", "g7g6", "g2g3", "f8g7", "f1g2"], note: "Classic struggle: White has extra pawn, Black has endless initiative." }
        ],
        trap_example: "Queenside siege winning White's a2 and b2 pawns with interest."
    },
    {
        id: "englund_gambit", name: "Englund Gambit", color: "black", eco: "A40",
        subtitle: "The Blitz Trickster's Dream",
        moves: ["d2d4", "e7e5", "d4e5", "b8c6", "g1f3", "d8e7", "c1f4", "e7b4", "c1d2", "b4b2"],
        san_moves: ["1. d4", "e5", "2. dxe5", "Nc6", "3. Nf3", "Qe7", "4. Bf4", "Qb4+", "5. Bd2", "Qxb2"],
        description: "Black immediately punishes White players who don't know the theory against 1... e5. Black skewers king and bishop, then invades b2 with catastrophic threats.",
        key_ideas: ["Queen check on b4 hitting White's king and undefended bishop", "Win back pawn or capture rook on a1", "Set quick checkmate nets on c1"],
        variations: [
            { name: "Main Trap Line", moves: ["d2d4", "e7e5", "d4e5", "b8c6", "g1f3", "d8e7", "c1f4", "e7b4", "c1d2", "b4b2", "d2c3", "f8b4", "d1d2", "b4c3", "d2c3", "b2c1"], note: "Queen checkmate on c1 on move 8!" }
        ],
        trap_example: "Move 8 checkmate Qc1#."
    },
    {
        id: "latvian_gambit", name: "Latvian Gambit", color: "black", eco: "C40",
        subtitle: "The Inverted King's Gambit",
        moves: ["e2e4", "e7e5", "g1f3", "f7f5"],
        san_moves: ["1. e4", "e5", "2. Nf3", "f5"],
        description: "One of the most fearless openings in chess. Black plays 2... f5, playing a King's Gambit with Black! Both sides face immediate lethal danger from move 2.",
        key_ideas: ["Break White's e4 pawn and seize initiative", "Open f-file for Black's rook", "Counter-attack White's f2 point with Bc5"],
        variations: [
            { name: "Polerio / Fraser Variation", moves: ["e2e4", "e7e5", "g1f3", "f7f5", "f3e5", "d8f6", "d2d4", "d7d6", "e5c4", "f5e4"], note: "Sharp tactical struggle in the center." }
        ],
        trap_example: "Bc5 and Qh4+ mating combinations."
    },
    {
        id: "albin_countergambit", name: "Albin Countergambit", color: "black", eco: "D08-D09",
        subtitle: "The Lasker Trap Machine",
        moves: ["d2d4", "d7d5", "c2c4", "e7e5", "d4e5", "d5d4"],
        san_moves: ["1. d4", "d5", "2. c4", "e5", "3. dxe5", "d4"],
        description: "Black meets the Queen's Gambit by striking back with 2... e5! The resulting passed d-pawn wedges deep into White's camp and sets up the famous Lasker Trap underpromotion.",
        key_ideas: ["Wedge d4 pawn cramping White's knight development", "Underpromote to a knight on move 7 with check!", "Rapid pieces coordination with Nc6 and Bg4"],
        variations: [
            { name: "Lasker Trap Line", moves: ["d2d4", "d7d5", "c2c4", "e7e5", "d4e5", "d5d4", "e2e3", "f8b4", "c1d2", "d4e3", "d2b4", "e3f2", "e1e2", "f2g1n"], note: "Promotes to Knight with check winning White's Queen!" }
        ],
        trap_example: "Underpromoting to a Knight on move 7 with check (fxg1=N+!!)."
    }
];

const DEFAULT_WEIGHTS = {
    name: "Trained Bot",
    pawn_val: 100.0, knight_val: 315.0, bishop_val: 330.0, rook_val: 500.0, queen_val: 900.0,
    pst_weight: 1.0, mobility_weight: 8.0, center_control_weight: 15.0, king_attack_weight: 24.0,
    development_weight: 18.0, open_file_weight: 16.0, bishop_pair_weight: 40.0,
    passed_pawn_weight: 25.0, pawn_structure_weight: -12.0, gambit_aggression: 1.8
};

const FALLBACK_PERSONALITIES = [
    {
        id: "tal", name: "Mikhail Tal (The Magician)", avatar: "🧙‍♂️",
        description: "Hyper-aggressive, sacrifices material for king attacks, open diagonals, and chaotic complications.",
        preferred_gambits: ["kings_gambit", "danish_gambit", "halloween_gambit", "latvian_gambit"],
        default_depth: 4,
        weights: { ...DEFAULT_WEIGHTS, name: "Mikhail Tal", pawn_val: 90, knight_val: 330, bishop_val: 345, rook_val: 490, queen_val: 920, mobility_weight: 14, center_control_weight: 18, king_attack_weight: 38, development_weight: 22, open_file_weight: 20, bishop_pair_weight: 50, gambit_aggression: 2.4 }
    },
    {
        id: "morphy", name: "Paul Morphy (The Romantic)", avatar: "⚔️",
        description: "Rapid development, open files, classical piece harmony, and relentless central tempo.",
        preferred_gambits: ["evans_gambit", "kings_gambit", "scotch_gambit"],
        default_depth: 4,
        weights: { ...DEFAULT_WEIGHTS, name: "Paul Morphy", pawn_val: 95, knight_val: 320, bishop_val: 335, rook_val: 510, queen_val: 900, mobility_weight: 11, center_control_weight: 22, king_attack_weight: 28, development_weight: 32, open_file_weight: 25, bishop_pair_weight: 45, gambit_aggression: 2.0 }
    },
    {
        id: "kasparov", name: "Garry Kasparov (The Boss)", avatar: "👑",
        description: "Deep dynamic calculation, crushing central initiative, and suffocating pressure.",
        preferred_gambits: ["queens_gambit", "evans_gambit", "smith_morra", "benko_gambit"],
        default_depth: 4,
        weights: { ...DEFAULT_WEIGHTS, name: "Garry Kasparov", pawn_val: 100, knight_val: 325, bishop_val: 335, rook_val: 505, queen_val: 915, mobility_weight: 10, center_control_weight: 24, king_attack_weight: 26, development_weight: 20, open_file_weight: 18, bishop_pair_weight: 42, gambit_aggression: 1.7 }
    },
    {
        id: "rosen_trap", name: "The Trap Master (Stafford Specialist)", avatar: "🎯",
        description: "Loves sneaky counter-gambits, poisoned pawns, and sudden checkmating ambushes.",
        preferred_gambits: ["stafford_gambit", "englund_gambit", "budapest_gambit", "albin_countergambit"],
        default_depth: 4,
        weights: { ...DEFAULT_WEIGHTS, name: "Trap Master", pawn_val: 85, knight_val: 330, bishop_val: 340, rook_val: 495, queen_val: 930, mobility_weight: 15, center_control_weight: 16, king_attack_weight: 35, development_weight: 24, open_file_weight: 18, bishop_pair_weight: 45, gambit_aggression: 2.2 }
    },
    {
        id: "trained", name: "Custom Trained AI Bot", avatar: "🤖",
        description: "Trained by reinforcement learning and master games to master aggressive gambit play.",
        preferred_gambits: [],
        default_depth: 4,
        weights: { ...DEFAULT_WEIGHTS }
    }
];

const PST = {
    P: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    N: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    R: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    Q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    K: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
};

const PIECE_ORDER_VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

class FastChessState {
    constructor() {
        this.squares = new Array(64).fill(null);
        this.turn = 'w';
        this.castling = { K: true, Q: true, k: true, q: true };
        this.enPassant = null;
        this.halfmoveClock = 0;
        this.fullmoveNumber = 1;
    }

    static fromFen(fen) {
        const st = new FastChessState();
        const parts = (fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1").trim().split(/\s+/);
        const rows = parts[0].split('/');
        st.squares.fill(null);
        for (let r = 7; r >= 0; r--) {
            const rowStr = rows[7 - r] || "";
            let f = 0;
            for (let i = 0; i < rowStr.length; i++) {
                const ch = rowStr[i];
                if (ch >= '1' && ch <= '8') {
                    f += parseInt(ch, 10);
                } else {
                    st.squares[r * 8 + f] = ch;
                    f++;
                }
            }
        }
        st.turn = parts[1] || 'w';
        const c = parts[2] || '-';
        st.castling = { K: c.includes('K'), Q: c.includes('Q'), k: c.includes('k'), q: c.includes('q') };
        st.enPassant = (parts[3] && parts[3] !== '-') ? FastChessState.algToIdx(parts[3]) : null;
        st.halfmoveClock = parseInt(parts[4], 10) || 0;
        st.fullmoveNumber = parseInt(parts[5], 10) || 1;
        return st;
    }

    static algToIdx(alg) {
        if (!alg || alg.length < 2) return null;
        return (parseInt(alg[1], 10) - 1) * 8 + (alg.charCodeAt(0) - 97);
    }

    static idxToAlg(idx) {
        return String.fromCharCode(97 + (idx % 8)) + (Math.floor(idx / 8) + 1);
    }

    clone() {
        const c = new FastChessState();
        c.squares = this.squares.slice();
        c.turn = this.turn;
        c.castling = { ...this.castling };
        c.enPassant = this.enPassant;
        c.halfmoveClock = this.halfmoveClock;
        c.fullmoveNumber = this.fullmoveNumber;
        return c;
    }

    toFen() {
        let fen = '';
        for (let r = 7; r >= 0; r--) {
            let empty = 0;
            for (let f = 0; f < 8; f++) {
                const p = this.squares[r * 8 + f];
                if (!p) empty++;
                else {
                    if (empty > 0) { fen += empty; empty = 0; }
                    fen += p;
                }
            }
            if (empty > 0) fen += empty;
            if (r > 0) fen += '/';
        }
        let c = '';
        if (this.castling.K) c += 'K';
        if (this.castling.Q) c += 'Q';
        if (this.castling.k) c += 'k';
        if (this.castling.q) c += 'q';
        fen += ` ${this.turn} ${c || '-'} ${this.enPassant !== null ? FastChessState.idxToAlg(this.enPassant) : '-'} ${this.halfmoveClock} ${this.fullmoveNumber}`;
        return fen;
    }

    isWhite(p) { return p && p === p.toUpperCase(); }

    findKing(isWhite) {
        const target = isWhite ? 'K' : 'k';
        for (let i = 0; i < 64; i++) if (this.squares[i] === target) return i;
        return -1;
    }

    isSquareAttacked(idx, byWhite) {
        if (idx < 0 || idx > 63) return false;
        const tf = idx % 8, tr = Math.floor(idx / 8);
        const pawnDir = byWhite ? 1 : -1;
        const pawnChar = byWhite ? 'P' : 'p';
        for (const df of [-1, 1]) {
            const pf = tf - df, pr = tr - pawnDir;
            if (pf >= 0 && pf < 8 && pr >= 0 && pr < 8 && this.squares[pr * 8 + pf] === pawnChar) return true;
        }
        const knightChar = byWhite ? 'N' : 'n';
        const kDeltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [df, dr] of kDeltas) {
            const f = tf + df, r = tr + dr;
            if (f >= 0 && f < 8 && r >= 0 && r < 8 && this.squares[r * 8 + f] === knightChar) return true;
        }
        const rookA = byWhite ? 'R' : 'r', queenA = byWhite ? 'Q' : 'q', bishA = byWhite ? 'B' : 'b', kingA = byWhite ? 'K' : 'k';
        const sDirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (const [df, dr] of sDirs) {
            let f = tf + df, r = tr + dr;
            while (f >= 0 && f < 8 && r >= 0 && r < 8) {
                const p = this.squares[r * 8 + f];
                if (p) { if (p === rookA || p === queenA) return true; break; }
                f += df; r += dr;
            }
        }
        const dDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
        for (const [df, dr] of dDirs) {
            let f = tf + df, r = tr + dr;
            while (f >= 0 && f < 8 && r >= 0 && r < 8) {
                const p = this.squares[r * 8 + f];
                if (p) { if (p === bishA || p === queenA) return true; break; }
                f += df; r += dr;
            }
        }
        for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
                if (df === 0 && dr === 0) continue;
                const f = tf + df, r = tr + dr;
                if (f >= 0 && f < 8 && r >= 0 && r < 8 && this.squares[r * 8 + f] === kingA) return true;
            }
        }
        return false;
    }

    isInCheck() {
        const isW = this.turn === 'w';
        return this.isSquareAttacked(this.findKing(isW), !isW);
    }

    generatePseudoMovesFor(fromIdx) {
        const p = this.squares[fromIdx];
        if (!p) return [];
        const isW = this.isWhite(p);
        const f = fromIdx % 8, r = Math.floor(fromIdx / 8);
        const type = p.toUpperCase();
        const moves = [];

        const tryPush = (tf, tr, flags = {}) => {
            if (tf < 0 || tf >= 8 || tr < 0 || tr >= 8) return false;
            const toIdx = tr * 8 + tf;
            const tgt = this.squares[toIdx];
            if (!tgt) {
                moves.push({ from: fromIdx, to: toIdx, ...flags });
                return true;
            }
            if (this.isWhite(tgt) !== isW) {
                moves.push({ from: fromIdx, to: toIdx, capture: true, ...flags });
            }
            return false;
        };

        if (type === 'P') {
            const dir = isW ? 1 : -1;
            const startRank = isW ? 1 : 6;
            const promoRank = isW ? 7 : 0;
            const r1 = r + dir;
            if (r1 >= 0 && r1 < 8 && !this.squares[r1 * 8 + f]) {
                if (r1 === promoRank) {
                    for (const pr of ['q', 'r', 'b', 'n']) moves.push({ from: fromIdx, to: r1 * 8 + f, promo: pr });
                } else {
                    moves.push({ from: fromIdx, to: r1 * 8 + f });
                    const r2 = r + dir * 2;
                    if (r === startRank && !this.squares[r2 * 8 + f]) {
                        moves.push({ from: fromIdx, to: r2 * 8 + f, doublePawn: true });
                    }
                }
            }
            for (const df of [-1, 1]) {
                const cf = f + df, cr = r + dir;
                if (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
                    const cIdx = cr * 8 + cf;
                    const tgt = this.squares[cIdx];
                    if (tgt && this.isWhite(tgt) !== isW) {
                        if (cr === promoRank) {
                            for (const pr of ['q', 'r', 'b', 'n']) moves.push({ from: fromIdx, to: cIdx, capture: true, promo: pr });
                        } else {
                            moves.push({ from: fromIdx, to: cIdx, capture: true });
                        }
                    } else if (cIdx === this.enPassant) {
                        moves.push({ from: fromIdx, to: cIdx, capture: true, enPassant: true });
                    }
                }
            }
        } else if (type === 'N') {
            for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) tryPush(f + df, r + dr);
        } else if (type === 'B') {
            for (const [df, dr] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
                let cf = f + df, cr = r + dr;
                while (tryPush(cf, cr)) { cf += df; cr += dr; }
            }
        } else if (type === 'R') {
            for (const [df, dr] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                let cf = f + df, cr = r + dr;
                while (tryPush(cf, cr)) { cf += df; cr += dr; }
            }
        } else if (type === 'Q') {
            for (const [df, dr] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
                let cf = f + df, cr = r + dr;
                while (tryPush(cf, cr)) { cf += df; cr += dr; }
            }
        } else if (type === 'K') {
            for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                    if (df !== 0 || dr !== 0) tryPush(f + df, r + dr);
                }
            }
            if (isW && f === 4 && r === 0) {
                if (this.castling.K && this.squares[7] === 'R' && !this.squares[5] && !this.squares[6] &&
                    !this.isSquareAttacked(4, false) && !this.isSquareAttacked(5, false) && !this.isSquareAttacked(6, false)) {
                    moves.push({ from: fromIdx, to: 6, castle: 'K' });
                }
                if (this.castling.Q && this.squares[0] === 'R' && !this.squares[1] && !this.squares[2] && !this.squares[3] &&
                    !this.isSquareAttacked(4, false) && !this.isSquareAttacked(3, false) && !this.isSquareAttacked(2, false)) {
                    moves.push({ from: fromIdx, to: 2, castle: 'Q' });
                }
            } else if (!isW && f === 4 && r === 7) {
                if (this.castling.k && this.squares[63] === 'r' && !this.squares[61] && !this.squares[62] &&
                    !this.isSquareAttacked(60, true) && !this.isSquareAttacked(61, true) && !this.isSquareAttacked(62, true)) {
                    moves.push({ from: fromIdx, to: 62, castle: 'k' });
                }
                if (this.castling.q && this.squares[56] === 'r' && !this.squares[57] && !this.squares[58] && !this.squares[59] &&
                    !this.isSquareAttacked(60, true) && !this.isSquareAttacked(59, true) && !this.isSquareAttacked(58, true)) {
                    moves.push({ from: fromIdx, to: 58, castle: 'q' });
                }
            }
        }
        return moves;
    }

    legalMoves() {
        const isW = this.turn === 'w';
        const legal = [];
        for (let i = 0; i < 64; i++) {
            const p = this.squares[i];
            if (!p || this.isWhite(p) !== isW) continue;
            const pseudo = this.generatePseudoMovesFor(i);
            for (const m of pseudo) {
                const sFrom = this.squares[m.from];
                const sTo = this.squares[m.to];
                let epSq = null, epCap = null;
                if (m.enPassant) {
                    epSq = m.to + (isW ? -8 : 8);
                    epCap = this.squares[epSq];
                    this.squares[epSq] = null;
                }
                this.squares[m.to] = sFrom;
                this.squares[m.from] = null;
                const kIdx = this.findKing(isW);
                const bad = this.isSquareAttacked(kIdx, !isW);
                this.squares[m.from] = sFrom;
                this.squares[m.to] = sTo;
                if (m.enPassant) this.squares[epSq] = epCap;
                if (!bad) {
                    m.uci = FastChessState.idxToAlg(m.from) + FastChessState.idxToAlg(m.to) + (m.promo || '');
                    legal.push(m);
                }
            }
        }
        return legal;
    }

    pushMove(m) {
        const p = this.squares[m.from];
        const isW = this.isWhite(p);
        const cap = this.squares[m.to];

        this.squares[m.to] = m.promo ? (isW ? m.promo.toUpperCase() : m.promo.toLowerCase()) : p;
        this.squares[m.from] = null;

        if (m.enPassant) {
            this.squares[m.to + (isW ? -8 : 8)] = null;
        }
        if (m.castle) {
            if (m.castle === 'K') { this.squares[5] = 'R'; this.squares[7] = null; }
            if (m.castle === 'Q') { this.squares[3] = 'R'; this.squares[0] = null; }
            if (m.castle === 'k') { this.squares[61] = 'r'; this.squares[63] = null; }
            if (m.castle === 'q') { this.squares[59] = 'r'; this.squares[56] = null; }
        }
        this.enPassant = m.doublePawn ? (m.from + (isW ? 8 : -8)) : null;

        if (p === 'K') { this.castling.K = false; this.castling.Q = false; }
        if (p === 'k') { this.castling.k = false; this.castling.q = false; }
        if (m.from === 0 || m.to === 0) this.castling.Q = false;
        if (m.from === 7 || m.to === 7) this.castling.K = false;
        if (m.from === 56 || m.to === 56) this.castling.q = false;
        if (m.from === 63 || m.to === 63) this.castling.k = false;

        this.halfmoveClock = (p.toUpperCase() === 'P' || cap || m.enPassant) ? 0 : (this.halfmoveClock + 1);
        this.turn = isW ? 'b' : 'w';
        if (this.turn === 'w') this.fullmoveNumber++;
    }

    isInsufficientMaterial() {
        let minors = 0;
        for (let i = 0; i < 64; i++) {
            const p = this.squares[i];
            if (!p) continue;
            const t = p.toUpperCase();
            if (t === 'P' || t === 'R' || t === 'Q') return false;
            if (t === 'N' || t === 'B') minors++;
        }
        return minors <= 1;
    }

    moveToSan(m, cachedMoves = null) {
        const p = this.squares[m.from];
        if (!p) return m.uci || '';
        const type = p.toUpperCase();
        const toAlg = FastChessState.idxToAlg(m.to);
        let san = '';

        if (m.castle === 'K' || m.castle === 'k') {
            san = 'O-O';
        } else if (m.castle === 'Q' || m.castle === 'q') {
            san = 'O-O-O';
        } else if (type === 'P') {
            if (m.capture || m.enPassant) {
                san = String.fromCharCode(97 + (m.from % 8)) + 'x' + toAlg;
            } else {
                san = toAlg;
            }
            if (m.promo) san += '=' + m.promo.toUpperCase();
        } else {
            const allMoves = cachedMoves || this.legalMoves();
            const peers = allMoves.filter(o => o.to === m.to && o.from !== m.from && this.squares[o.from] === p);
            let disambig = '';
            if (peers.length > 0) {
                const sameFile = peers.some(o => (o.from % 8) === (m.from % 8));
                const sameRank = peers.some(o => Math.floor(o.from / 8) === Math.floor(m.from / 8));
                if (!sameFile) disambig = String.fromCharCode(97 + (m.from % 8));
                else if (!sameRank) disambig = String(Math.floor(m.from / 8) + 1);
                else disambig = FastChessState.idxToAlg(m.from);
            }
            san = type + disambig + (m.capture ? 'x' : '') + toAlg;
        }

        const next = this.clone();
        next.pushMove(m);
        if (next.isInCheck()) {
            const nextMoves = next.legalMoves();
            san += nextMoves.length === 0 ? '#' : '+';
        }
        return san;
    }
}

class OfflineEngine {
    constructor() {
        this.storageKey = 'gambit_master_trained_weights';
        this.trainedWeights = this._loadStoredWeights();
        this._stopTrainingFlag = false;
    }

    _loadStoredWeights() {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem(this.storageKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    return { ...DEFAULT_WEIGHTS, ...parsed };
                }
            }
        } catch (_) {}
        return null;
    }

    getTrainedWeights() {
        return this.trainedWeights ? { ...DEFAULT_WEIGHTS, ...this.trainedWeights } : { ...DEFAULT_WEIGHTS };
    }

    setTrainedWeights(weights) {
        const clean = { ...DEFAULT_WEIGHTS };
        for (const k of Object.keys(DEFAULT_WEIGHTS)) {
            if (weights && weights[k] !== undefined && weights[k] !== null) {
                clean[k] = k === 'name' ? String(weights[k]) : (Number(weights[k]) || DEFAULT_WEIGHTS[k]);
            }
        }
        this.trainedWeights = clean;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.storageKey, JSON.stringify(clean));
            }
        } catch (_) {}
        return clean;
    }

    getGambits() {
        return FALLBACK_GAMBITS;
    }

    getPersonalities() {
        return FALLBACK_PERSONALITIES.map(p => {
            if (p.id === 'trained' && this.trainedWeights) {
                return { ...p, weights: { ...this.trainedWeights } };
            }
            return { ...p, weights: { ...p.weights } };
        });
    }

    getPersonalityWeights(personalityId, customWeights = null) {
        if (customWeights) return { ...DEFAULT_WEIGHTS, ...customWeights };
        if (personalityId === 'trained' && this.trainedWeights) return { ...this.trainedWeights };
        const found = FALLBACK_PERSONALITIES.find(p => p.id === personalityId) || FALLBACK_PERSONALITIES[0];
        return { ...found.weights };
    }

    findGambitContinuation(playedMoves, preferredGambitId = null) {
        const matchLine = (line) => playedMoves.length < line.length && line.slice(0, playedMoves.length).every((mv, idx) => mv === playedMoves[idx]);
        if (preferredGambitId) {
            const g = FALLBACK_GAMBITS.find(x => x.id === preferredGambitId);
            if (g) {
                if (matchLine(g.moves)) return { uci: g.moves[playedMoves.length], name: g.name };
                for (const v of (g.variations || [])) {
                    if (matchLine(v.moves)) return { uci: v.moves[playedMoves.length], name: g.name };
                }
            }
        }
        const candidates = [];
        for (const g of FALLBACK_GAMBITS) {
            if (matchLine(g.moves)) candidates.push({ uci: g.moves[playedMoves.length], name: g.name });
            for (const v of (g.variations || [])) {
                if (matchLine(v.moves)) candidates.push({ uci: v.moves[playedMoves.length], name: g.name });
            }
        }
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return null;
    }

    matchGambitFromMoves(playedMoves) {
        for (const g of FALLBACK_GAMBITS) {
            if (playedMoves.length <= g.moves.length && g.moves.slice(0, playedMoves.length).every((m, i) => m === playedMoves[i])) {
                return g;
            }
        }
        return null;
    }

    evaluateState(state, weights, legalCountPre = null) {
        const w = weights || DEFAULT_WEIGHTS;
        const pVals = { P: w.pawn_val, N: w.knight_val, B: w.bishop_val, R: w.rook_val, Q: w.queen_val };
        let score = 0;
        let wBishops = 0, bBishops = 0;
        const wPawnsOnFile = new Array(8).fill(0);
        const bPawnsOnFile = new Array(8).fill(0);
        const wRooks = [], bRooks = [];

        for (let sq = 0; sq < 64; sq++) {
            const p = state.squares[sq];
            if (!p) continue;
            const isW = p === p.toUpperCase();
            const type = p.toUpperCase();
            const file = sq % 8;

            if (type === 'P') {
                if (isW) wPawnsOnFile[file]++; else bPawnsOnFile[file]++;
            } else if (type === 'B') {
                if (isW) wBishops++; else bBishops++;
            } else if (type === 'R') {
                if (isW) wRooks.push(file); else bRooks.push(file);
            }

            const base = pVals[type] || 0;
            const pstIdx = isW ? (63 - sq) : sq;
            const pst = (PST[type] ? PST[type][pstIdx] : 0) * w.pst_weight;
            if (isW) score += base + pst;
            else score -= base + pst;
        }

        if (wBishops >= 2) score += w.bishop_pair_weight;
        if (bBishops >= 2) score -= w.bishop_pair_weight;

        // Development
        let wDev = 0, bDev = 0;
        for (const sq of [1, 6, 2, 5]) { const p = state.squares[sq]; if (!p || p !== p.toUpperCase()) wDev++; }
        for (const sq of [57, 62, 58, 61]) { const p = state.squares[sq]; if (!p || p !== p.toLowerCase()) bDev++; }
        score += (wDev - bDev) * w.development_weight;

        // Open files & doubled pawns
        for (const f of wRooks) {
            if (wPawnsOnFile[f] === 0) score += w.open_file_weight * (bPawnsOnFile[f] === 0 ? 1.5 : 1.0);
        }
        for (const f of bRooks) {
            if (bPawnsOnFile[f] === 0) score -= w.open_file_weight * (wPawnsOnFile[f] === 0 ? 1.5 : 1.0);
        }
        for (let f = 0; f < 8; f++) {
            if (wPawnsOnFile[f] > 1) score += (wPawnsOnFile[f] - 1) * w.pawn_structure_weight;
            if (bPawnsOnFile[f] > 1) score -= (bPawnsOnFile[f] - 1) * w.pawn_structure_weight;
        }

        // Center control & King ring pressure (lightweight square attack probes)
        const coreCenter = [28, 27, 36, 35]; // e4, d4, e5, d5
        for (const csq of coreCenter) {
            if (state.isSquareAttacked(csq, true)) score += w.center_control_weight;
            if (state.isSquareAttacked(csq, false)) score -= w.center_control_weight;
        }

        const bKing = state.findKing(false);
        const wKing = state.findKing(true);
        if (bKing >= 0) {
            const kf = bKing % 8, kr = Math.floor(bKing / 8);
            let pressure = 0;
            for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                    const nf = kf + df, nr = kr + dr;
                    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8 && (df !== 0 || dr !== 0)) {
                        if (state.isSquareAttacked(nr * 8 + nf, true)) pressure++;
                    }
                }
            }
            score += pressure * w.king_attack_weight * w.gambit_aggression;
        }
        if (wKing >= 0) {
            const kf = wKing % 8, kr = Math.floor(wKing / 8);
            let pressure = 0;
            for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                    const nf = kf + df, nr = kr + dr;
                    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8 && (df !== 0 || dr !== 0)) {
                        if (state.isSquareAttacked(nr * 8 + nf, false)) pressure++;
                    }
                }
            }
            score -= pressure * w.king_attack_weight * w.gambit_aggression;
        }

        if (legalCountPre !== null) {
            score += (state.turn === 'w' ? 1 : -1) * (legalCountPre * (w.mobility_weight * 0.25));
        }
        return Math.round(score);
    }

    _orderMoves(state, moves, hashUci = null) {
        return moves.map(m => {
            let s = 0;
            if (hashUci && m.uci === hashUci) s += 1000000;
            if (m.capture) {
                const vic = state.squares[m.to];
                const att = state.squares[m.from];
                const vv = vic ? (PIECE_ORDER_VAL[vic.toLowerCase()] || 100) : 100;
                const av = att ? (PIECE_ORDER_VAL[att.toLowerCase()] || 100) : 100;
                s += 100000 + vv * 10 - av;
            }
            if (m.promo) s += 80000;
            if (m.castle) s += 500;
            return { m, s };
        }).sort((a, b) => b.s - a.s).map(x => x.m);
    }

    _quiescence(state, alpha, beta, weights, deadline, ctx, qply = 0) {
        ctx.nodes++;
        if (ctx.allowAbort && (ctx.nodes & 127) === 0 && Date.now() > deadline) {
            ctx.aborted = true;
            return alpha;
        }
        let standPat = this.evaluateState(state, weights);
        if (state.turn === 'b') standPat = -standPat;
        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;
        if (qply >= 3) return standPat;

        const captures = this._orderMoves(state, state.legalMoves().filter(m => m.capture || m.promo));
        for (const m of captures) {
            const next = state.clone();
            next.pushMove(m);
            const sc = -this._quiescence(next, -beta, -alpha, weights, deadline, ctx, qply + 1);
            if (ctx.aborted) return alpha;
            if (sc >= beta) return beta;
            if (sc > alpha) alpha = sc;
        }
        return alpha;
    }

    _alphaBeta(state, depth, alpha, beta, weights, deadline, ctx, ply = 0) {
        ctx.nodes++;
        if (ctx.allowAbort && (ctx.nodes & 127) === 0 && Date.now() > deadline) {
            ctx.aborted = true;
            return alpha;
        }
        if (state.halfmoveClock >= 100 || state.isInsufficientMaterial()) return 0;

        const moves = state.legalMoves();
        if (moves.length === 0) {
            return state.isInCheck() ? (-20000 + ply) : 0;
        }
        if (depth <= 0) {
            return this._quiescence(state, alpha, beta, weights, deadline, ctx, 0);
        }

        const ordered = this._orderMoves(state, moves);
        let best = -999999;
        for (const m of ordered) {
            const next = state.clone();
            next.pushMove(m);
            const sc = -this._alphaBeta(next, depth - 1, -beta, -alpha, weights, deadline, ctx, ply + 1);
            if (ctx.aborted) return best;
            if (sc > best) best = sc;
            if (sc > alpha) alpha = sc;
            if (alpha >= beta) break;
        }
        return best;
    }

    findBestMove(state, weights, depth = 3, maxMs = 450) {
        const start = Date.now();
        const deadline = start + maxMs;
        const legal = state.legalMoves();
        if (legal.length === 0) return { move: null, score: 0, nodes: 0, depth: 0, time: 0 };
        if (legal.length === 1) {
            return { move: legal[0], score: this.evaluateState(state, weights), nodes: 1, depth: 1, time: 0.001 };
        }

        const targetDepth = Math.min(3, Math.max(1, depth));
        let bestMove = legal[0];
        let bestScore = 0;
        let completedDepth = 0;
        const ctx = { nodes: 0, allowAbort: false, aborted: false };

        for (let d = 1; d <= targetDepth; d++) {
            if (d > 1 && Date.now() >= deadline) break;
            ctx.allowAbort = d > 1;
            ctx.aborted = false;
            let curBestMove = null;
            let curBestScore = -999999;
            let alpha = -999999;
            const beta = 999999;
            const ordered = this._orderMoves(state, legal, bestMove.uci);

            for (const m of ordered) {
                const next = state.clone();
                next.pushMove(m);
                const sc = -this._alphaBeta(next, d - 1, -beta, -alpha, weights, deadline, ctx, 1);
                if (ctx.aborted) break;
                if (sc > curBestScore) {
                    curBestScore = sc;
                    curBestMove = m;
                }
                if (sc > alpha) alpha = sc;
                if (ctx.allowAbort && Date.now() >= deadline) {
                    ctx.aborted = true;
                    break;
                }
            }
            if (!ctx.aborted && curBestMove) {
                bestMove = curBestMove;
                bestScore = curBestScore;
                completedDepth = d;
            } else {
                break;
            }
        }
        return {
            move: bestMove,
            score: bestScore,
            nodes: ctx.nodes,
            depth: completedDepth || 1,
            time: Math.round((Date.now() - start)) / 1000
        };
    }

    chooseMove(fen, movesList = [], personalityId = 'tal', preferredGambitId = null, depth = 3, customWeights = null) {
        const state = FastChessState.fromFen(fen);
        const legal = state.legalMoves();
        if (legal.length === 0) return null;

        const personality = FALLBACK_PERSONALITIES.find(p => p.id === personalityId) || FALLBACK_PERSONALITIES[0];
        const effectiveGambit = preferredGambitId || (personality.preferred_gambits && personality.preferred_gambits[0]) || null;
        const weights = this.getPersonalityWeights(personalityId, customWeights);

        // 1. Check opening book
        const bookHit = this.findGambitContinuation(movesList || [], effectiveGambit);
        if (bookHit) {
            const bookMove = legal.find(m => m.uci === bookHit.uci);
            if (bookMove) {
                const san = state.moveToSan(bookMove, legal);
                const next = state.clone();
                next.pushMove(bookMove);
                const whiteEval = this.evaluateState(state, weights);
                const evalCp = state.turn === 'w' ? whiteEval : -whiteEval;
                return {
                    move: bookMove.uci,
                    san,
                    fen_after: next.toFen(),
                    is_book: true,
                    gambit_name: bookHit.name,
                    eval_cp: evalCp,
                    nodes: 1,
                    depth: 0,
                    time: 0.001,
                    comment: `Playing ${bookHit.name} book line!`
                };
            }
        }

        // 2. Search Engine fallback
        const res = this.findBestMove(state, weights, depth, 450);
        const chosen = res.move || legal[0];
        const san = state.moveToSan(chosen, legal);
        const next = state.clone();
        next.pushMove(chosen);
        const pName = personality.name.split(' ')[0];
        let comment = `${pName}: 'Active play and piece pressure will decide this!'`;
        if (res.score > 200) comment = `${pName}: 'My pieces are swarming your position. Feel the attack!'`;
        else if (res.score < -200) comment = `${pName}: 'A worthy counterattack, but the battle is far from over!'`;

        return {
            move: chosen.uci,
            san,
            fen_after: next.toFen(),
            is_book: false,
            gambit_name: null,
            eval_cp: res.score,
            nodes: res.nodes,
            depth: res.depth,
            time: res.time,
            comment
        };
    }

    evaluatePosition(fen, personalityId = 'tal', customWeights = null) {
        const state = FastChessState.fromFen(fen);
        const legal = state.legalMoves();
        const inCheck = state.isInCheck();
        let scoreCp = 0;
        if (legal.length === 0) {
            scoreCp = inCheck ? (state.turn === 'w' ? -20000 : 20000) : 0;
        } else if (state.isInsufficientMaterial()) {
            scoreCp = 0;
        } else {
            const weights = this.getPersonalityWeights(personalityId, customWeights);
            scoreCp = this.evaluateState(state, weights, legal.length);
        }
        return {
            eval_cp: scoreCp,
            eval_pawns: Math.round(scoreCp) / 100,
            turn: state.turn === 'w' ? 'white' : 'black',
            is_check: inCheck,
            is_checkmate: legal.length === 0 && inCheck,
            is_stalemate: legal.length === 0 && !inCheck
        };
    }

    async trainEvolutionary({ generations = 3, depth = 1, personality = 'tal' }, onProgress, shouldStop) {
        const base = this.getPersonalityWeights(personality);
        let champion = { ...base };
        const positions = [
            ["e2e4", "e7e5", "f2f4"],
            ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4"],
            ["e2e4", "e7e5", "d2d4", "e5d4", "c2c3", "d4c3", "f1c4"]
        ];
        const fields = [
            "mobility_weight", "center_control_weight", "king_attack_weight",
            "development_weight", "open_file_weight", "bishop_pair_weight",
            "passed_pawn_weight", "pawn_structure_weight", "gambit_aggression"
        ];
        const mutate = (w) => {
            const child = { ...w };
            for (const f of fields) {
                if (Math.random() < 0.6) {
                    const delta = (Math.random() * 2 - 1) * 0.2 * Math.abs(child[f]);
                    child[f] = f === "pawn_structure_weight"
                        ? Math.round(Math.min(-1.0, child[f] + delta) * 100) / 100
                        : Math.round(Math.max(1.0, child[f] + delta) * 100) / 100;
                }
            }
            return child;
        };

        for (let gen = 1; gen <= generations; gen++) {
            if (shouldStop && shouldStop()) break;
            const t0 = Date.now();
            const candidates = [champion, mutate(champion), mutate(champion)];
            const scores = [0, 0, 0];
            let totalGames = 0;

            for (const line of positions) {
                for (let i = 0; i < candidates.length; i++) {
                    for (let j = i + 1; j < candidates.length; j++) {
                        for (const [wIdx, bIdx] of [[i, j], [j, i]]) {
                            if (shouldStop && shouldStop()) break;
                            const st = FastChessState.fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                            for (const u of line) {
                                const mv = st.legalMoves().find(m => m.uci === u);
                                if (mv) st.pushMove(mv);
                            }
                            for (let ply = 0; ply < 12; ply++) {
                                const legal = st.legalMoves();
                                if (legal.length === 0) break;
                                const activeW = st.turn === 'w' ? candidates[wIdx] : candidates[bIdx];
                                const res = this.findBestMove(st, activeW, Math.min(2, depth), 40);
                                if (!res.move) break;
                                st.pushMove(res.move);
                            }
                            const ev = this.evaluateState(st, candidates[wIdx]);
                            const r = ev > 150 ? 1 : (ev < -150 ? 0 : 0.5);
                            scores[wIdx] += r;
                            scores[bIdx] += (1 - r);
                            totalGames++;
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 5));
            }
            const bestIdx = scores.indexOf(Math.max(...scores));
            champion = { ...candidates[bestIdx], name: `Trained Bot (Gen ${gen})` };
            this.setTrainedWeights(champion);
            if (onProgress) {
                onProgress({
                    generation: gen,
                    total_generations: generations,
                    best_score: Math.round(scores[bestIdx] * 100) / 100,
                    total_games: totalGames,
                    elapsed_seconds: Math.round((Date.now() - t0) / 10) / 100,
                    ...champion
                });
            }
        }
        return this.setTrainedWeights(champion);
    }

    reviewGame(movesUci, initialFen = null) {
        const cpToWin = (cp) => {
            const c = Math.max(-1500, Math.min(1500, cp));
            return 100.0 / (1.0 + Math.pow(10.0, -c / 400.0));
        };
        const accFromWin = (before, after) => {
            const loss = Math.max(0, before - after);
            return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1668));
        };

        const state = FastChessState.fromFen(initialFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        const weights = { ...DEFAULT_WEIGHTS };
        const reviewMoves = [];
        const evalHistory = [this.evaluateState(state, weights)];
        const whiteAcc = [], blackAcc = [];
        const emptyCounts = () => ({ brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, book: 0 });
        const whiteCounts = emptyCounts(), blackCounts = emptyCounts();
        const playedSoFar = [];
        let maxSwing = 0, turningPoint = -1;

        for (let ply = 0; ply < movesUci.length; ply++) {
            const uci = movesUci[ply];
            const isW = state.turn === 'w';
            const legal = state.legalMoves();
            const played = legal.find(m => m.uci === uci);
            if (!played) break;

            const searchRes = this.findBestMove(state, weights, 2, 120);
            const bestMove = searchRes.move || played;
            const bestUci = bestMove.uci;
            const bestSan = state.moveToSan(bestMove, legal);
            const evalBeforeSide = searchRes.score;
            const winBefore = cpToWin(evalBeforeSide);

            const playedSan = state.moveToSan(played, legal);
            playedSoFar.push(uci);
            const gambitMatch = this.matchGambitFromMoves(playedSoFar);
            const isBook = gambitMatch !== null && ply < 12;

            state.pushMove(played);
            const evalAfterWhite = this.evaluateState(state, weights);
            evalHistory.push(evalAfterWhite);
            const evalAfterSide = isW ? evalAfterWhite : -evalAfterWhite;
            const winAfter = cpToWin(evalAfterSide);
            const deltaCp = Math.max(0, evalBeforeSide - evalAfterSide);
            const deltaWin = Math.max(0, winBefore - winAfter);
            const accuracy = accFromWin(winBefore, winAfter);

            if (isW) whiteAcc.push(accuracy); else blackAcc.push(accuracy);

            let classification = 'good', explanation = 'A sound move keeping the game balanced.';
            if (isBook) {
                classification = 'book';
                explanation = `Book move: part of ${gambitMatch.name} opening theory.`;
            } else if (uci === bestUci || deltaCp <= 15) {
                classification = 'best';
                explanation = 'The best tactical continuation according to the engine.';
            } else if (deltaCp <= 40) {
                classification = 'excellent';
                explanation = 'A very strong and natural move.';
            } else if (deltaCp <= 85) {
                classification = 'good';
                explanation = 'A sound move keeping the game balanced.';
            } else if (deltaCp <= 175) {
                classification = 'inaccuracy';
                explanation = `Inaccuracy. Better was ${bestSan} (${bestUci}) to maintain pressure.`;
            } else if (deltaCp <= 350) {
                classification = 'mistake';
                explanation = `Mistake. Concedes advantage. ${bestSan} was significantly stronger.`;
            } else {
                classification = 'blunder';
                explanation = `Blunder! Major shift in evaluation. Best was ${bestSan}.`;
            }

            const counts = isW ? whiteCounts : blackCounts;
            counts[classification]++;
            if (deltaWin > maxSwing && (classification === 'blunder' || classification === 'mistake')) {
                maxSwing = deltaWin;
                turningPoint = ply;
            }

            reviewMoves.push({
                ply,
                move_number: Math.floor(ply / 2) + 1,
                color: isW ? 'white' : 'black',
                uci,
                san: playedSan,
                best_uci: bestUci,
                best_san: bestSan,
                fen_after: state.toFen(),
                eval_white_cp: evalAfterWhite,
                eval_white_pawns: Math.round(evalAfterWhite) / 100,
                delta_cp: Math.round(deltaCp * 10) / 10,
                accuracy: Math.round(accuracy * 10) / 10,
                classification,
                explanation
            });
        }

        const avg = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 100.0;
        return {
            summary: {
                white_accuracy: avg(whiteAcc),
                black_accuracy: avg(blackAcc),
                white_counts: whiteCounts,
                black_counts: blackCounts,
                total_moves: reviewMoves.length,
                turning_point_ply: turningPoint
            },
            eval_history: evalHistory,
            moves: reviewMoves
        };
    }
}

window.FastChessState = FastChessState;
window.offlineEngine = new OfflineEngine();
