"""One isolated match, shared by the local server and browser worker."""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

from .agents import load_checkpoint
from .game import new_game
from .rules import CARD_LABELS, ITEM_COSTS, PLAIN_BLOCKS, RULESET_VERSION, UNIT_SPECS
from .search import TurnSearchAgent, search_profile_from_metadata, state_weights_from_metadata


class PrototypeMatch:
    def __init__(self, checkpoint: str | Path = "models/search_v3.json", seed: int = 42) -> None:
        weights, metadata = load_checkpoint(checkpoint)
        self.agent = TurnSearchAgent(
            weights,
            state_weights=state_weights_from_metadata(metadata),
            **search_profile_from_metadata(metadata),
            seed=123,
        )
        self.seed = seed
        self.revision = 0
        self.game = new_game(self.seed)
        self.message = "Välj din blå commander eller ett kort."

    def state(self) -> dict:
        game = self.game
        legal = game.legal_actions() if game.current_player == 0 else []
        labels = {name: CARD_LABELS.get(name, name.replace("_", " ").title()) for name in UNIT_SPECS | ITEM_COSTS}
        return {
            "revision": self.revision,
            "ruleset": RULESET_VERSION,
            "player": game.current_player,
            "turn": game.half_turn,
            "actions_left": game.actions_left,
            "terminal": game.terminal,
            "winner": game.winner,
            "message": self.message,
            "units": [asdict(unit) | {"attacked": sorted(unit.attacked)} for unit in game.units.values()],
            "blocks": [[x, y] for x, y in sorted(PLAIN_BLOCKS)],
            "logs": [[x, y, hp] for (x, y), hp in game.logs.items()],
            "fires": [[x, y, turns] for (x, y), turns in game.fires.items()],
            "hand": game.players[0].hand,
            "deck_counts": [len(game.players[0].unit_deck), len(game.players[0].item_deck)],
            "opponent_hand_count": len(game.players[1].hand),
            "labels": labels,
            "costs": {name: spec.deploy_cost for name, spec in UNIT_SPECS.items()} | ITEM_COSTS,
            "legal": [asdict(action) | {"id": index, "description": game.describe_action(action)} for index, action in enumerate(legal)],
        }

    def act(self, payload: dict) -> None:
        if payload.get("revision") != self.revision:
            raise ValueError("Matchen har ändrats. Välj draget igen.")
        if self.game.terminal or self.game.current_player != 0:
            raise ValueError("Det är inte din tur.")
        action_id = payload.get("action_id")
        legal = self.game.legal_actions()
        if type(action_id) not in (int, float) or not float(action_id).is_integer() or not 0 <= action_id < len(legal):
            raise ValueError("Draget finns inte bland de tillåtna dragen.")
        action = legal[int(action_id)]
        self.message = self.game.describe_action(action)
        self.game.step(action)
        self.revision += 1
        moves = 0
        while not self.game.terminal and self.game.current_player == 1:
            self.game.step(self.agent.choose_action(self.game))
            moves += 1
        if moves:
            self.message = f"AI:n gjorde {moves} handlingar. Din tur."
        if self.game.terminal:
            self.message = "Du vann!" if self.game.winner == 0 else "AI:n vann!" if self.game.winner == 1 else "Oavgjort."

    def reset(self) -> None:
        self.seed += 1
        self.game = new_game(self.seed)
        self.agent._cached.clear()
        self.agent._value_cache.clear()
        self.revision += 1
        self.message = "Ny match. Välj din commander eller ett kort."

