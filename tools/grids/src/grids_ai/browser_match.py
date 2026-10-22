"""One isolated match, shared by the local server and browser worker."""
from __future__ import annotations

from dataclasses import asdict, replace
from pathlib import Path

from .agents import load_checkpoint
from .game import GameState, PlayerState, Unit, new_game
from .rules import CARD_LABELS, ITEM_COSTS, PLAIN_BLOCKS, RULESET_VERSION, UNIT_SPECS
from .search import TurnSearchAgent, search_profile_from_metadata, state_weights_from_metadata

CARD_INFO = {
    "commander": "Närstrid. Förlorar du din Commander är matchen slut.",
    "warrior": "Närstrid. Kan flytta fram före ett slag och stöta undan målet.",
    "viking": "Närstrid. Hög skada men kort förflyttning.",
    "assassin": "Närstrid. Snabb förflyttning och låg utplaceringskostnad.",
    "ninja": "Närstrid. Originalets osynlighetsförmåga är ännu inte införd.",
    "archer": "Distansattack. Kräver fri sikt; enheter och hinder blockerar pilen.",
    "freeze_mage": "Magi. Fryser målet i 2 turbyten. Kan bara attackera en gång per tur.",
    "healer": "Helar vänliga enheter, upp till 20 % över deras maxliv.",
    "strength": "Ger +10 skada till en vänlig enhet som inte är fryst.",
    "freeze": "Fryser en enhet i 4 turbyten. En fryst enhet kan inte flytta eller attackera.",
    "meteorite": "40 skada på träffrutan. Stöter undan enheter runt nedslaget.",
    "fireball": "Eld i 4 turbyten: 15 skada per turbyte på rutan. Brännskada utanför elden: 10.",
    "action_block": "Spärrar 3 handlingar under motståndarens nästa två egna turer (4 turbyten).",
    "brain_power": "Tar permanent över en fiende. Målet får 30 skada.",
    "charm": "Tar över en fiende tills nästa spelares tur börjar.",
    "teleport": "Flyttar en vänlig enhet till en tom ruta.",
}
SAVE_FORMAT = "grids-browser-match-v1"


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
        self.autoplay = False
        self.paused = False
        self.history = []

    def state(self) -> dict:
        game = self.game
        legal = game.legal_actions() if game.current_player == 0 and not self.autoplay else []
        labels = {name: CARD_LABELS.get(name, name.replace("_", " ").title()) for name in UNIT_SPECS | ITEM_COSTS}
        return {
            "revision": self.revision,
            "ruleset": RULESET_VERSION,
            "player": game.current_player,
            "autoplay": self.autoplay,
            "paused": self.paused,
            "turn": game.half_turn,
            "actions_left": game.actions_left,
            "terminal": game.terminal,
            "winner": game.winner,
            "message": self.message,
            "ai_cells": self.ai_cells,
            "event": self.event,
            "units": [self._unit_info(unit) for unit in game.units.values()],
            "blocks": [[x, y] for x, y in sorted(PLAIN_BLOCKS)],
            "logs": [[x, y, hp] for (x, y), hp in game.logs.items()],
            "fires": [[x, y, turns] for (x, y), turns in game.fires.items()],
            "hand": game.players[0].hand,
            "deck_counts": [len(game.players[0].unit_deck), len(game.players[0].item_deck)],
            "opponent_hand_count": len(game.players[1].hand),
            "labels": labels,
            "costs": {name: spec.deploy_cost for name, spec in UNIT_SPECS.items()} | ITEM_COSTS,
            "unit_specs": {name: asdict(spec) for name, spec in UNIT_SPECS.items()},
            "card_info": CARD_INFO,
            "history": self.history,
            "legal": [asdict(action) | {"id": index, "description": game.describe_action(action)} for index, action in enumerate(legal)],
        }

    def _unit_info(self, unit) -> dict:
        spec = UNIT_SPECS[unit.kind]
        cells = [[x, y] for y in range(7) for x in range(10)
                 if (x, y) != unit.pos and (x, y) not in PLAIN_BLOCKS
                 and self.game._in_range(unit.pos, (x, y), spec.attack_range)
                 and (spec.attack_type != "ranged" or self.game.has_line_of_sight(unit.pos, (x, y)))]
        return asdict(unit) | {"attacked": sorted(unit.attacked), "range_cells": cells,
                               "move_cells": [list(pos) for pos in self.game.reachable(unit) if pos != unit.pos] if not unit.frozen else []}

    def act(self, payload: dict) -> None:
        if payload.get("revision") != self.revision:
            raise ValueError("Matchen har ändrats. Välj draget igen.")
        if self.game.terminal or self.game.current_player != 0 or self.autoplay:
            raise ValueError("Det är inte din tur.")
        action_id = payload.get("action_id")
        legal = self.game.legal_actions()
        if type(action_id) not in (int, float) or not float(action_id).is_integer() or not 0 <= action_id < len(legal):
            raise ValueError("Draget finns inte bland de tillåtna dragen.")
        action = legal[int(action_id)]
        self.message = self._describe(action)
        self._step(action)
        self.ai_cells = []
        self._finish_message()

    def ai_step(self, payload: dict) -> None:
        if payload.get("revision") != self.revision:
            raise ValueError("Matchen har ändrats. Välj draget igen.")
        if self.game.terminal or (self.game.current_player != 1 and not self.autoplay):
            raise ValueError("Det är inte AI:ns tur.")
        if self.autoplay and self.paused and payload.get("single_step") is not True:
            raise ValueError("AI-spelarna är pausade. Välj Nästa drag.")
        action = self.agent.choose_action(self.game)
        side = "Blå AI" if self.game.current_player == 0 else "Röd AI"
        self.message = (side if self.autoplay else "AI") + ": " + self._describe(action)
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

    def set_autoplay(self, payload: dict) -> None:
        if payload.get("revision") != self.revision:
            raise ValueError("Matchen har ändrats. Försök igen.")
        enabled = payload.get("enabled")
        if type(enabled) is not bool:
            raise ValueError("Välj om auto play ska vara på eller av.")
        if enabled and self.game.terminal:
            raise ValueError("Matchen är slut. Starta en ny match.")
        self.autoplay = enabled
        self.paused = False
        self.agent._cached.clear()
        self.agent._value_cache.clear()
        self.revision += 1
        self.event = {}
        self.ai_cells = []
        self.message = "AI mot AI fortsätter härifrån." if enabled else "Du styr blått igen."
        self._finish_message()

    def set_paused(self, payload: dict) -> None:
        if payload.get("revision") != self.revision:
            raise ValueError("Matchen har ändrats. Försök igen.")
        if not self.autoplay or self.game.terminal or type(payload.get("paused")) is not bool:
            raise ValueError("Pausa eller fortsätt när AI mot AI är aktivt.")
        self.paused = payload["paused"]
        self.revision += 1
        self.event = {}
        self.ai_cells = []
        self.message = "Båda AI-spelarna är pausade. Nästa drag spelar en handling." if self.paused else "AI mot AI fortsätter."

    def _step(self, action) -> None:
        # Record public combat results without changing the simulation or search.
        before = {uid: replace(unit) for uid, unit in self.game.units.items()}
        originals = self.game.units.copy()
        logs = self.game.logs.copy()
        attacker = before.get(action.unit_id)
        target = before.get(action.target_id)
        cell = list(target.pos) if target else [action.x, action.y]
        actor, turn = self.game.current_player, self.game.half_turn
        plain_description = self._describe(action)
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
        details = []
        for change in changes:
            name = CARD_LABELS.get(change["kind"], change["kind"].replace("_", " ").title())
            hp = change.get("hp_damage", change["hp_before"] - change["hp_after"])
            armor = change["armor_before"] - change["armor_after"]
            text = f"{name}: {'−' if hp >= 0 else '+'}{abs(hp)} liv ({change['hp_before']} → {change['hp_after']})"
            if armor:
                text += f", −{armor} rustning"
            if change["dead"]:
                text += ", besegrad" if change["kind"] != "log" else ", förstörd"
            details.append(text)
        self.history.append({"revision": self.revision, "turn": turn, "player": actor,
                             "description": plain_description, "details": details})
        self.history = self.history[-500:]

    def _describe(self, action) -> str:
        name = lambda kind: CARD_LABELS.get(kind, kind.replace("_", " ").title())
        unit = self.game.units.get(action.unit_id)
        target = self.game.units.get(action.target_id)
        actor = f"{name(unit.kind)} #{unit.id}" if unit else ""
        goal = f"{name(target.kind)} #{target.id}" if target else f"ruta {action.x + 1}, {action.y + 1}"
        if action.kind == "end": return "Avslutar turen"
        if action.kind == "draw_unit": return "Drar ett enhetskort (1 handling)"
        if action.kind == "draw_item": return "Drar ett föremålskort (1 handling)"
        if action.kind == "move": return f"{actor} flyttar till {action.x + 1}, {action.y + 1}"
        if action.kind == "attack": return f"{actor} attackerar {goal}"
        if action.kind == "attack_log": return f"{actor} attackerar en stock"
        if action.kind == "heal": return f"{actor} helar {goal}"
        if action.kind == "deploy": return f"Placerar {name(action.card)} på {action.x + 1}, {action.y + 1}"
        if action.kind == "item": return f"Använder {name(action.card)}" + (f" på {goal}" if target or action.x >= 0 else "")
        return self.game.describe_action(action)

    def save(self) -> dict:
        game = self.game
        fields = ("current_player", "actions_left", "half_turn", "next_unit_id", "winner", "terminal_reason", "max_half_turns", "seed")
        return {"format": SAVE_FORMAT, "ruleset": RULESET_VERSION, "seed": self.seed,
                "revision": self.revision, "autoplay": self.autoplay, "paused": self.paused,
                "message": self.message, "history": self.history,
                "game": {**{key: getattr(game, key) for key in fields},
                         "players": [asdict(player) for player in game.players],
                         "units": [asdict(unit) | {"attacked": sorted(unit.attacked)} for unit in game.units.values()],
                         "logs": [[x, y, hp] for (x, y), hp in game.logs.items()],
                         "fires": [[x, y, turns] for (x, y), turns in game.fires.items()]}}

    def restore(self, saved: dict) -> None:
        try:
            if saved["format"] != SAVE_FORMAT or saved["ruleset"] != RULESET_VERSION:
                raise ValueError("Sparfilen tillhör en annan spelversion.")
            data = saved["game"].copy()
            players = [PlayerState(**player) for player in data.pop("players")]
            units = {}
            for raw in data.pop("units"):
                unit_data = raw | {"attacked": set(raw["attacked"])}
                unit = Unit(**unit_data)
                if any(type(getattr(unit, field)) is not int for field in ("id", "owner", "x", "y", "hp", "max_hp", "damage", "armor", "frozen", "burning")) or any(type(uid) is not int for uid in unit.attacked):
                    raise ValueError("Ogiltiga enhetsvärden i sparfilen.")
                if unit.id in units or unit.kind not in UNIT_SPECS or unit.owner not in (0, 1) or not (0 <= unit.x < 10 and 0 <= unit.y < 7) or unit.hp <= 0:
                    raise ValueError("Ogiltig enhet i sparfilen.")
                if unit.max_hp <= 0 or any(getattr(unit, field) < 0 for field in ("damage", "armor", "frozen", "burning")):
                    raise ValueError("Ogiltiga enhetsvärden i sparfilen.")
                units[unit.id] = unit
            logs = {(x, y): hp for x, y, hp in data.pop("logs")}
            fires = {(x, y): turns for x, y, turns in data.pop("fires")}
            game = GameState(players=players, units=units, logs=logs, fires=fires, **data)
            cards = set(UNIT_SPECS) | set(ITEM_COSTS)
            if len(players) != 2 or any(card not in cards for p in players for card in p.hand + p.unit_deck + p.item_deck):
                raise ValueError("Ogiltiga kort i sparfilen.")
            if any(type(p.blocked_turns) is not int or p.blocked_turns < 0 for p in players):
                raise ValueError("Ogiltig Action Block i sparfilen.")
            if any(type(getattr(game, field)) is not int for field in ("current_player", "actions_left", "half_turn", "next_unit_id", "seed")) or game.winner not in (None, -1, 0, 1) or not isinstance(game.terminal_reason, str):
                raise ValueError("Ogiltig tur i sparfilen.")
            if game.current_player not in (0, 1) or not 0 <= game.actions_left <= 7 or game.half_turn < 1 or game.next_unit_id <= max(units, default=-1):
                raise ValueError("Ogiltig tur i sparfilen.")
            if not game.terminal and not all(game.commander(player) for player in (0, 1)):
                raise ValueError("En Commander saknas i sparfilen.")
            if len({unit.pos for unit in units.values()}) != len(units) or any(pos in PLAIN_BLOCKS for pos in (unit.pos for unit in units.values())):
                raise ValueError("Enheter överlappar i sparfilen.")
            if any(not game.inside(pos) or hp <= 0 for pos, hp in logs.items()) or any(not game.inside(pos) or turns <= 0 for pos, turns in fires.items()):
                raise ValueError("Ogiltigt bräde i sparfilen.")
            if type(saved["autoplay"]) is not bool or type(saved["paused"]) is not bool or type(saved["revision"]) is not int or saved["revision"] < 0:
                raise ValueError("Ogiltigt spelläge i sparfilen.")
            if type(saved["seed"]) is not int or (saved["paused"] and not saved["autoplay"]):
                raise ValueError("Ogiltigt spelläge i sparfilen.")
            if not isinstance(saved["history"], list):
                raise ValueError("Ogiltig draglogg.")
            history = saved["history"][-500:]
            if any(not isinstance(entry["description"], str) or not isinstance(entry["details"], list) or not all(isinstance(line, str) for line in entry["details"]) or entry["player"] not in (0, 1) or type(entry["turn"]) is not int for entry in history):
                raise ValueError("Ogiltig draglogg.")
        except (KeyError, TypeError, AttributeError) as error:
            raise ValueError("Sparfilen kunde inte läsas.") from error
        self.game, self.seed, self.revision = game, saved["seed"], saved["revision"]
        self.autoplay, self.paused = saved["autoplay"], saved["paused"]
        self.message, self.history = str(saved["message"]), history
        self.event, self.ai_cells = {}, []
        self.agent._cached.clear()
        self.agent._value_cache.clear()

    def _finish_message(self) -> None:
        if self.game.terminal:
            if self.autoplay:
                self.message = "Blå AI vann!" if self.game.winner == 0 else "Röd AI vann!" if self.game.winner == 1 else "Oavgjort."
            else:
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
        self.autoplay = False
        self.paused = False
        self.history = []

