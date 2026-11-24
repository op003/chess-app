"""
Chess Engine Package for Gambit-Style Play & Training
"""
from .evaluator import Evaluator, EvalWeights
from .openings import GAMBITS, get_gambit_move, get_gambit_by_id
from .search import SearchEngine
from .bot import ChessBot, BOT_PERSONALITIES
from .trainer import BotTrainer

__all__ = [
    "Evaluator",
    "EvalWeights",
    "GAMBITS",
    "get_gambit_move",
    "get_gambit_by_id",
    "SearchEngine",
    "ChessBot",
    "BOT_PERSONALITIES",
    "BotTrainer",
]
