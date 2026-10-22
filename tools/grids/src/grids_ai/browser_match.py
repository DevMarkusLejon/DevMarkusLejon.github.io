"""One isolated match, shared by the local server and browser worker."""
from __future__ import annotations

from dataclasses import asdict, replace
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
        self.ai_cells = []
        self.event = {}

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
            "ai_cells": self.ai_cells,
            "event": self.event,
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
        self._step(action)
        self.ai_cells = []
        self._finish_message()

    def ai_step(self, payload: dict) -> None:
        if payload.get("revision") != self.revision:
            raise ValueError("Matchen har ändrats. Välj draget igen.")
        if self.game.terminal or self.game.current_player != 1:
            raise ValueError("Det är inte AI:ns tur.")
        action = self.agent.choose_action(self.game)
        self.message = "AI: " + self.game.describe_action(action)
        self.ai_cells = []
        for unit_id in (action.unit_id, action.target_id):
            if unit_id in self.game.units:
                self.ai_cells.append(list(self.game.units[unit_id].pos))
        if action.x >= 0 and action.y >= 0:
            self.ai_cells.append([action.x, action.y])
        if action.kind == "attack_log":
            self.ai_cells.append([int(value) for value in action.card.split(",")])
        self._step(action)
        self._finish_message()

    def _step(self, action) -> None:
        # Record public combat results without changing the simulation or search.
        before = {uid: replace(unit) for uid, unit in self.game.units.items()}
        originals = self.game.units.copy()
        logs = self.game.logs.copy()
        attacker = before.get(action.unit_id)
        target = before.get(action.target_id)
        cell = list(target.pos) if target else [action.x, action.y]
        if action.kind == "attack_log":
            cell = [int(value) for value in action.card.split(",")]
        self.game.step(action)
        self.revision += 1
        changes = []
        for uid, old in before.items():
            new = self.game.units.get(uid)
            hp = max(0, new.hp) if new else 0
            armor = new.armor if new else 0
            if hp != old.hp or armor != old.armor:
                changes.append({
                    "id": uid, "kind": old.kind, "owner": old.owner,
                    "cell": list(old.pos), "hp_before": old.hp, "hp_after": hp,
                    "hp_damage": old.hp - originals[uid].hp,
                    "armor_before": old.armor, "armor_after": armor, "dead": new is None,
                })
        for pos, hp in logs.items():
            remaining = self.game.logs.get(pos, 0)
            if hp != remaining:
                changes.append({"id": -1, "kind": "log", "cell": list(pos),
                                "hp_before": hp, "hp_after": remaining,
                                "armor_before": 0, "armor_after": 0, "dead": remaining == 0})
        moved = self.game.units.get(action.unit_id)
        self.event = {
            "kind": action.kind, "card": action.card, "unit_id": action.unit_id,
            "unit_kind": attacker.kind if attacker else "",
            "attack_type": UNIT_SPECS[attacker.kind].attack_type if attacker else "",
            "source": list(attacker.pos) if attacker else cell,
            "approach": list(moved.pos) if moved else cell,
            "target": cell, "changes": changes, "description": self.message,
        }

    def _finish_message(self) -> None:
        if self.game.terminal:
            self.message = "Du vann!" if self.game.winner == 0 else "AI:n vann!" if self.game.winner == 1 else "Oavgjort."

    def reset(self) -> None:
        self.seed += 1
        self.game = new_game(self.seed)
        self.agent._cached.clear()
        self.agent._value_cache.clear()
        self.revision += 1
        self.message = "Ny match. Välj din commander eller ett kort."
        self.ai_cells = []
        self.event = {}

