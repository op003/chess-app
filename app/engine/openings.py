"""
Comprehensive Top Gambit Openings Database & Book for Chess
Covers the top historical and modern tactical gambits for White and Black.
"""
from typing import Dict, List, Optional
import random

GAMBITS: Dict[str, dict] = {
    # ==================== WHITE GAMBITS ====================
    "kings_gambit": {
        "id": "kings_gambit",
        "name": "King's Gambit",
        "color": "white",
        "eco": "C30-C39",
        "subtitle": "The Romantic Immortal Classic",
        "moves": ["e2e4", "e7e5", "f2f4"],
        "san_moves": ["1. e4", "e5", "2. f4"],
        "description": "One of the oldest and most romantic openings. White immediately offers the f-pawn on move 2 to deflect Black's e5 pawn, seize the center with d4, and open the f-file for kingside attack.",
        "key_ideas": [
            "Deflect Black's central e5 pawn",
            "Build a massive pawn center with d2-d4",
            "Open the f-file for the White rook after castling",
            "Target Black's weak f7 square with Bc4"
        ],
        "variations": [
            {
                "name": "Accepted - Kieseritzky Gambit",
                "moves": ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "g7g5", "h2h4", "g5g4", "f3e5"],
                "note": "Sharpest line against Black's pawn chain g5."
            },
            {
                "name": "Accepted - Modern Cunningham Defense",
                "moves": ["e2e4", "e7e5", "f2f4", "e5f4", "g1f3", "f8e7", "f1c4", "e7h4", "e1f1"],
                "note": "White accepts king displacement for massive development."
            },
            {
                "name": "Declined - Falkbeer Countergambit",
                "moves": ["e2e4", "e7e5", "f2f4", "d7d5", "e4d5", "e5e4"],
                "note": "Black fights for central initiative by sacrificing d5."
            }
        ],
        "trap_example": "Muzio Gambit piece sacrifice leading to lightning checkmates on f7."
    },
    "queens_gambit": {
        "id": "queens_gambit",
        "name": "Queen's Gambit",
        "color": "white",
        "eco": "D06-D69",
        "subtitle": "The Championship Powerhouse",
        "moves": ["d2d4", "d7d5", "c2c4"],
        "san_moves": ["1. d4", "d5", "2. c4"],
        "description": "The most prestigious gambit in chess history. White sacrifices a wing pawn (c4) to dismantle Black's center and gain spatial dominance.",
        "key_ideas": [
            "Exchange a flank pawn for Black's central d5 pawn",
            "Establish two pawns in the center with e2-e4",
            "Apply queenside pressure down the c-file",
            "Rapid minor piece development to active squares"
        ],
        "variations": [
            {
                "name": "Accepted (QGA)",
                "moves": ["d2d4", "d7d5", "c2c4", "d5c4", "g1f3", "g8f6", "e2e3", "e7e6", "f1c4"],
                "note": "White regains the pawn with tempo and strong center."
            },
            {
                "name": "Declined - Orthodox (QGD)",
                "moves": ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7"],
                "note": "The rock-solid classical defense."
            },
            {
                "name": "Slav Defense",
                "moves": ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6", "b1c3", "d5c4"],
                "note": "Solid pawn triangle supporting d5."
            }
        ],
        "trap_example": "Elephant Trap in Queen's Gambit Declined."
    },
    "evans_gambit": {
        "id": "evans_gambit",
        "name": "Evans Gambit",
        "color": "white",
        "eco": "C51-C52",
        "subtitle": "Morphy & Kasparov's Lethal Weapon",
        "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4"],
        "san_moves": ["1. e4", "e5", "2. Nf3", "Nc6", "3. Bc4", "Bc5", "4. b4"],
        "description": "White offers the b-pawn to gain tempos with c3 and d4, dominating the center and opening deadly diagonal attacks on the Black king.",
        "key_ideas": [
            "Sacrifice b4 pawn to deflect Black's dark-square bishop",
            "Play c2-c3 with tempo on the bishop",
            "Push d2-d4 to erect an imposing center",
            "Deploy Queen to b3 or Ba3 to paralyze Black's king"
        ],
        "variations": [
            {
                "name": "Accepted - Main Line",
                "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4", "c5b4", "c2c3", "b4a5", "d2d4", "e5d4", "e1g1"],
                "note": "Compromised Defense with rapid open file threats."
            },
            {
                "name": "Declined",
                "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "b2b4", "c5b6", "a2a4", "a7a6"],
                "note": "White claims space on the queenside."
            }
        ],
        "trap_example": "Quick mate on f7 when Black wastes time holding the b4 pawn."
    },
    "danish_gambit": {
        "id": "danish_gambit",
        "name": "Danish Gambit",
        "color": "white",
        "eco": "C21",
        "subtitle": "The Double Pawn Bishop Laser",
        "moves": ["e2e4", "e7e5", "d2d4", "e5d4", "c2c3", "d4c3", "f1c4", "c3b2", "c1b2"],
        "san_moves": ["1. e4", "e5", "2. d4", "exd4", "3. c3", "dxc3", "4. Bc4", "cxb2", "5. Bxb2"],
        "description": "White boldly gives up TWO whole pawns to position both bishops on razor-sharp diagonals slicing directly toward Black's uncastled kingside.",
        "key_ideas": [
            "Give up two pawns to maximize development speed",
            "Two monster bishops pointing at g7 and f7",
            "Total domination of central files and open diagonals",
            "Crush Black before they can organize defense"
        ],
        "variations": [
            {
                "name": "Schlechter Defense",
                "moves": ["e2e4", "e7e5", "d2d4", "e5d4", "c2c3", "d4c3", "f1c4", "c3b2", "c1b2", "d7d5", "c4d5", "g8f6"],
                "note": "Black returns a pawn to neutralize the attack."
            }
        ],
        "trap_example": "Immediate Bxf7+ king decoying tactics."
    },
    "vienna_gambit": {
        "id": "vienna_gambit",
        "name": "Vienna Gambit",
        "color": "white",
        "eco": "C29",
        "subtitle": "The Steinitz Heavyweight Strike",
        "moves": ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4"],
        "san_moves": ["1. e4", "e5", "2. Nc3", "Nf6", "3. f4"],
        "description": "An improved version of the King's Gambit. By developing Nc3 first, White prevents Black's queen check on h4 and prepares an immediate central explosion.",
        "key_ideas": [
            "Stop Black's Qh4+ counterattacks",
            "Strike at Black's e5 pawn with f4",
            "Prepare e4-e5 pushing Black's f6 knight away",
            "Create powerful kingside attacking chances"
        ],
        "variations": [
            {
                "name": "Main Line 3... d5",
                "moves": ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4", "d7d5", "f4e5", "f6e4", "d1f3"],
                "note": "Sharpest tactical counter-blow."
            },
            {
                "name": "Accepted 3... exf4?!",
                "moves": ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4", "e5f4", "e4e5", "d8e7", "d1e2"],
                "note": "White traps or pushes back Black's knight immediately."
            }
        ],
        "trap_example": "3... exf4 4. e5 traps the knight or forces an ugly queen block."
    },
    "smith_morra": {
        "id": "smith_morra",
        "name": "Smith-Morra Gambit",
        "color": "white",
        "eco": "B21",
        "subtitle": "The Sicilian Destroyer",
        "moves": ["e2e4", "c7c5", "d2d4", "c5d4", "c2c3", "d4c3", "b1c3"],
        "san_moves": ["1. e4", "c5", "2. d4", "cxd4", "3. c3", "dxc3", "4. Nxc3"],
        "description": "White's favorite aggressive weapon against the Sicilian Defense. White gives up a pawn on move 3 to tear open the c and d files for rooks and rapidly mobilize all pieces.",
        "key_ideas": [
            "Tear open the c and d files for heavy pieces",
            "Station bishops aggressively on c4 and f4/g5",
            "Target weak d6 pawn and d5 outpost",
            "Overwhelm Black's slow king safety"
        ],
        "variations": [
            {
                "name": "Classical Defense",
                "moves": ["e2e4", "c7c5", "d2d4", "c5d4", "c2c3", "d4c3", "b1c3", "b8c6", "g1f3", "d7d6", "f1c4", "e7e6", "e1g1", "g8f6", "d1e2"],
                "note": "White sets up Rd1 and e4-e5 break."
            }
        ],
        "trap_example": "Bxf7+ followed by Ng5+ or Nd5 checkmating traps."
    },
    "scotch_gambit": {
        "id": "scotch_gambit",
        "name": "Scotch Gambit",
        "color": "white",
        "eco": "C44",
        "subtitle": "Rapid Central Strike",
        "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f1c4"],
        "san_moves": ["1. e4", "e5", "2. Nf3", "Nc6", "3. d4", "exd4", "4. Bc4"],
        "description": "White refuses to immediately recapture the d4 pawn, instead deploying the bishop to c4 targeting f7 and creating immediate attacking tension.",
        "key_ideas": [
            "Quick development of Bc4 aimed at f7",
            "Prepare c2-c3 or 0-0 followed by Re1",
            "Pin Black's knights and challenge center"
        ],
        "variations": [
            {
                "name": "4... Nf6 Line",
                "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f1c4", "g8f6", "e4e5", "d7d5", "c4b5", "f6e4", "f3d4"],
                "note": "Dynamic struggle in the center."
            }
        ],
        "trap_example": "Ng5 attacking f7 when Black plays prematurely."
    },
    "blackmar_diemer": {
        "id": "blackmar_diemer",
        "name": "Blackmar-Diemer Gambit",
        "color": "white",
        "eco": "D00",
        "subtitle": "The Hyper-Aggressive 1.d4 Gambit",
        "moves": ["d2d4", "d7d5", "e2e4", "d5e4", "b1c3", "g8f6", "f2f3", "e4f3", "g1f3"],
        "san_moves": ["1. d4", "d5", "2. e4", "dxe4", "3. Nc3", "Nf6", "4. f3", "exf3", "5. Nxf3"],
        "description": "Transforms a quiet d4 opening into a wild tactical bloodbath! White offers a pawn on f3 to unleash bishops and rooks down the open e and f files.",
        "key_ideas": [
            "Tear open the f-file for the kingside rook",
            "Supercharge bishop diagonals on c4 and g5",
            "Castling queenside (0-0-0) to add d-file rook pressure"
        ],
        "variations": [
            {
                "name": "Euwe Defense",
                "moves": ["d2d4", "d7d5", "e2e4", "d5e4", "b1c3", "g8f6", "f2f3", "e4f3", "g1f3", "e7e6", "f1d3", "f8e7"],
                "note": "Black seeks solid shelter."
            }
        ],
        "trap_example": "Halosar Trap: White mates or wins Queen in 8 moves."
    },
    "halloween_gambit": {
        "id": "halloween_gambit",
        "name": "Halloween Gambit",
        "color": "white",
        "eco": "C47",
        "subtitle": "The Shocking Knight Sacrifice",
        "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "f3e5"],
        "san_moves": ["1. e4", "e5", "2. Nf3", "Nc6", "3. Nc3", "Nf6", "4. Nxe5!?"],
        "description": "White plays a speculative sacrifice of a full minor piece on move 4! White's goal is to seize the complete center with d4 and e5, chasing Black's knights into awkward passive squares.",
        "key_ideas": [
            "Sacrifice knight on e5 to push d4 and e5",
            "Chase Black's knights back to the rim",
            "Choke Black's development with massive central space"
        ],
        "variations": [
            {
                "name": "Main Line",
                "moves": ["e2e4", "e7e5", "g1f3", "b8c6", "b1c3", "g8f6", "f3e5", "c6e5", "d2d4", "e5g6", "e4e5", "f6g8", "f1c4"],
                "note": "White controls everything while Black's pieces retreat."
            }
        ],
        "trap_example": "Black's king gets caught in center under raging pawn storm."
    },

    # ==================== BLACK GAMBITS ====================
    "stafford_gambit": {
        "id": "stafford_gambit",
        "name": "Stafford Gambit",
        "color": "black",
        "eco": "C42",
        "subtitle": "The Viral Tactical Ambush",
        "moves": ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6", "e5c6", "d7c6"],
        "san_moves": ["1. e4", "e5", "2. Nf3", "Nf6", "3. Nxe5", "Nc6", "4. Nxc6", "dxc6"],
        "description": "Popularized by IM Eric Rosen. Black sacrifices a pawn on move 3 in the Petroff Defense to blow open diagonal lines for both bishops and the queen, setting dozens of deadly mating traps.",
        "key_ideas": [
            "Open d-file and c8-h3 diagonal with dxc6",
            "Deploy Bc5 pointing straight at White's f2 square",
            "Jump Ng4 to coordinate with Qh4 for checkmate attacks",
            "Devastating traps if White plays routine developing moves"
        ],
        "variations": [
            {
                "name": "5. d3 Bc5 6. Bg5? Trap Line",
                "moves": ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6", "e5c6", "d7c6", "d2d3", "f8c5", "c1g5", "f6e4", "g5d8", "c5f2", "e1e2", "c8g4"],
                "note": "Classic smothered/double-check checkmate on move 8!"
            },
            {
                "name": "5. e5 Ne4 6. d3 Bc5",
                "moves": ["e2e4", "e7e5", "g1f3", "g8f6", "f3e5", "b8c6", "e5c6", "d7c6", "e4e5", "f6e4", "d2d4", "d8h4"],
                "note": "Direct assault on White's f2 vulnerability."
            }
        ],
        "trap_example": "The legendary 8-move queen sacrifice checkmate (Nxe4!!)."
    },
    "budapest_gambit": {
        "id": "budapest_gambit",
        "name": "Budapest Gambit",
        "color": "black",
        "eco": "A51-A52",
        "subtitle": "The Sharp Counterpunch Against 1.d4",
        "moves": ["d2d4", "g8f6", "c2c4", "e7e5", "d4e5", "f6g4"],
        "san_moves": ["1. d4", "Nf6", "2. c4", "e5", "3. dxe5", "Ng4"],
        "description": "Black immediately challenges White's 1.d4 dominance by sacrificing the e-pawn. The knight on g4, joined by Nc6 and Qe7/Bc5, relentlessly hammers White's overextended e5 pawn.",
        "key_ideas": [
            "Target the e5 weakness with Ng4, Nc6, and Qe7",
            "Exploit the open diagonal with Bc5",
            "Set up smothered mate threats on d3"
        ],
        "variations": [
            {
                "name": "Adler Variation",
                "moves": ["d2d4", "g8f6", "c2c4", "e7e5", "d4e5", "f6g4", "g1f3", "f8c5", "e2e3", "b8c6"],
                "note": "Pressure builds on e5."
            }
        ],
        "trap_example": "Nd3# smothered checkmate against White's queen."
    },
    "benko_gambit": {
        "id": "benko_gambit",
        "name": "Benko Gambit",
        "color": "black",
        "eco": "A57-A59",
        "subtitle": "Positional Masterpiece of Perpetual Pressure",
        "moves": ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5", "c4b5", "a7a6", "b5a6", "c8a6"],
        "san_moves": ["1. d4", "Nf6", "2. c4", "c5", "3. d5", "b5", "4. cxb5", "a6", "5. bxa6", "Bxa6"],
        "description": "Unlike tactical gambits that fade, the Benko gives Black durable, permanent positional pressure along the semi-open a- and b-files throughout the entire game.",
        "key_ideas": [
            "Dominate queenside open a- and b-files with rooks",
            "Fianchetto bishop on g7 slicing across the board",
            "Tie down White's pieces to defensive duty"
        ],
        "variations": [
            {
                "name": "Accepted - King Walk",
                "moves": ["d2d4", "g8f6", "c2c4", "c7c5", "d4d5", "b7b5", "c4b5", "a7a6", "b5a6", "c8a6", "b1c3", "d7d6", "e2e4", "a6f1", "e1f1", "g7g6", "g2g3", "f8g7", "f1g2"],
                "note": "Classic struggle: White has extra pawn, Black has endless initiative."
            }
        ],
        "trap_example": "Queenside siege winning White's a2 and b2 pawns with interest."
    },
    "englund_gambit": {
        "id": "englund_gambit",
        "name": "Englund Gambit",
        "color": "black",
        "eco": "A40",
        "subtitle": "The Blitz Trickster's Dream",
        "moves": ["d2d4", "e7e5", "d4e5", "b8c6", "g1f3", "d8e7", "c1f4", "e7b4", "c1d2", "b4b2"],
        "san_moves": ["1. d4", "e5", "2. dxe5", "Nc6", "3. Nf3", "Qe7", "4. Bf4", "Qb4+", "5. Bd2", "Qxb2"],
        "description": "Black immediately punishes White players who don't know the theory against 1... e5. Black skewers king and bishop, then invades b2 with catastrophic threats.",
        "key_ideas": [
            "Queen check on b4 hitting White's king and undefended bishop",
            "Win back pawn or capture rook on a1",
            "Set quick checkmate nets on c1"
        ],
        "variations": [
            {
                "name": "Main Trap Line",
                "moves": ["d2d4", "e7e5", "d4e5", "b8c6", "g1f3", "d8e7", "c1f4", "e7b4", "c1d2", "b4b2", "d2c3", "f8b4", "d1d2", "b4c3", "d2c3", "b2c1"],
                "note": "Queen checkmate on c1 on move 8!"
            }
        ],
        "trap_example": "Move 8 checkmate Qc1#."
    },
    "latvian_gambit": {
        "id": "latvian_gambit",
        "name": "Latvian Gambit",
        "color": "black",
        "eco": "C40",
        "subtitle": "The Inverted King's Gambit",
        "moves": ["e2e4", "e7e5", "g1f3", "f7f5"],
        "san_moves": ["1. e4", "e5", "2. Nf3", "f5"],
        "description": "One of the most fearless openings in chess. Black plays 2... f5, playing a King's Gambit with Black! Both sides face immediate lethal danger from move 2.",
        "key_ideas": [
            "Break White's e4 pawn and seize initiative",
            "Open f-file for Black's rook",
            "Counter-attack White's f2 point with Bc5"
        ],
        "variations": [
            {
                "name": "Polerio / Fraser Variation",
                "moves": ["e2e4", "e7e5", "g1f3", "f7f5", "f3e5", "d8f6", "d2d4", "d7d6", "e5c4", "f5e4"],
                "note": "Sharp tactical struggle in the center."
            }
        ],
        "trap_example": "Bc5 and Qh4+ mating combinations."
    },
    "albin_countergambit": {
        "id": "albin_countergambit",
        "name": "Albin Countergambit",
        "color": "black",
        "eco": "D08-D09",
        "subtitle": "The Lasker Trap Machine",
        "moves": ["d2d4", "d7d5", "c2c4", "e7e5", "d4e5", "d5d4"],
        "san_moves": ["1. d4", "d5", "2. c4", "e5", "3. dxe5", "d4"],
        "description": "Black meets the Queen's Gambit by striking back with 2... e5! The resulting passed d-pawn wedges deep into White's camp and sets up the famous Lasker Trap underpromotion.",
        "key_ideas": [
            "Wedge d4 pawn cramping White's knight development",
            "Underpromote to a knight on move 7 with check!",
            "Rapid pieces coordination with Nc6 and Bg4"
        ],
        "variations": [
            {
                "name": "Lasker Trap Line",
                "moves": ["d2d4", "d7d5", "c2c4", "e7e5", "d4e5", "d5d4", "e2e3", "f8b4", "c1d2", "d4e3", "d2b4", "e3f2", "e1e2", "f2g1n"],
                "note": "Promotes to Knight with check winning White's Queen!"
            }
        ],
        "trap_example": "Underpromoting to a Knight on move 7 with check (fxg1=N+!!)."
    }
}


def get_gambit_by_id(gambit_id: str) -> Optional[dict]:
    """Retrieve gambit definition by ID."""
    return GAMBITS.get(gambit_id)


def get_gambit_move(gambit_id: str, move_index: int) -> Optional[str]:
    """
    Get the next UCI move in a specific gambit by ply/move index.
    Returns None if book moves are exhausted.
    """
    gambit = GAMBITS.get(gambit_id)
    if not gambit:
        return None
    moves = gambit.get("moves", [])
    if move_index < len(moves):
        return moves[move_index]
    return None


def match_gambit_from_moves(played_moves: List[str]) -> Optional[dict]:
    """
    Match current played UCI moves against known gambit opening lines.
    """
    for gambit in GAMBITS.values():
        g_moves = gambit["moves"]
        if len(played_moves) <= len(g_moves):
            if g_moves[:len(played_moves)] == played_moves:
                return gambit
    return None


def find_gambit_continuation(played_moves: List[str], preferred_gambit_id: Optional[str] = None) -> Optional[str]:
    """
    Given a sequence of played UCI moves, find a book continuation that stays
    within a gambit repertoire.
    """
    # 1. Try preferred gambit if valid
    if preferred_gambit_id and preferred_gambit_id in GAMBITS:
        gambit = GAMBITS[preferred_gambit_id]
        g_moves = gambit["moves"]
        if len(played_moves) < len(g_moves):
            if g_moves[:len(played_moves)] == played_moves:
                return g_moves[len(played_moves)]
        # Check variations
        for var in gambit.get("variations", []):
            v_moves = var["moves"]
            if len(played_moves) < len(v_moves):
                if v_moves[:len(played_moves)] == played_moves:
                    return v_moves[len(played_moves)]

    # 2. Try any matching gambit
    candidate_continuations = []
    for gambit in GAMBITS.values():
        g_moves = gambit["moves"]
        if len(played_moves) < len(g_moves):
            if g_moves[:len(played_moves)] == played_moves:
                candidate_continuations.append(g_moves[len(played_moves)])
        for var in gambit.get("variations", []):
            v_moves = var["moves"]
            if len(played_moves) < len(v_moves):
                if v_moves[:len(played_moves)] == played_moves:
                    candidate_continuations.append(v_moves[len(played_moves)])

    if candidate_continuations:
        return random.choice(candidate_continuations)

    return None
