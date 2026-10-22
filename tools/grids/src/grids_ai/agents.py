"""Agents and learnable action features for Grids self-play."""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .game import Action, GameState
from .rules import ITEM_COSTS, MAX_ACTIONS, UNIT_SPECS

FEATURE_NAMES = (
    "initiative",
    "commander_damage",
    "unit_damage",
    "unit_kill",
    "commander_kill",
    "deploy_hp",
    "deploy_damage",
    "commander_progress",
    "enemy_progress",
    "healing",
    "draw_unit",
    "draw_item",
    "strength",
    "disable",
    "control",
    "area_damage",
    "fire_pressure",
    "teleport_progress",
    "action_cost",
    "end_with_actions",
    "exposure",
)

# A competent seed policy. Self-play evolves these values; the checkpoint is
# simply this named vector plus training history, so it remains inspectable.
BASE_WEIGHTS = np.array(
    [
        0.08,   # initiative
        8.0,    # commander damage
        3.0,    # unit damage
        5.0,    # unit kill
        100.0,  # commander kill
        1.2,    # deploy hp
        1.1,    # deploy damage
        0.8,    # commander progress
        0.25,   # nearest enemy progress
        2.5,    # healing
        0.35,   # draw unit
        0.45,   # draw item
        1.5,    # strength
        2.5,    # disable
        4.5,    # control
        2.0,    # area damage
        1.8,    # fire pressure
        0.7,    # teleport progress
        -0.18,  # action cost
        -0.9,   # end with unused actions
        -0.7,   # exposure
    ],
    dtype=np.float64,
)


def _distance(a: tuple[int, int], b: tuple[int, int]) -> float:
    return math.dist(a, b)


def _effective_damage(target, raw_damage: int) -> int:
    return min(target.hp, max(0, raw_damage - target.armor))


def _exposure(game: GameState, player: int, pos: tuple[int, int]) -> float:
    pressure = 0.0
    for enemy in game.units.values():
        if enemy.owner == player or enemy.frozen:
            continue
        spec = UNIT_SPECS[enemy.kind]
        distance = _distance(enemy.pos, pos)
        reach = spec.attack_range + (spec.walk if spec.attack_type == "melee" else 0)
        if distance <= reach + 0.5:
            pressure += enemy.damage / 100.0
    return pressure


def action_features(game: GameState, action: Action) -> np.ndarray:
    """Describe an action without looking at the opponent's hand or deck order."""
    f = np.zeros(len(FEATURE_NAMES), dtype=np.float64)
    player = game.current_player
    enemy_commander = game.commander(1 - player)
    own_commander = game.commander(player)

    if action.kind == "end":
        f[19] = game.actions_left / MAX_ACTIONS
        return f

    f[0] = 1.0
    unit = game.units.get(action.unit_id)
    target = game.units.get(action.target_id)

    if action.kind == "move" and unit:
        destination = (action.x, action.y)
        if enemy_commander:
            f[7] = (_distance(unit.pos, enemy_commander.pos) - _distance(destination, enemy_commander.pos)) / 5.0
        enemies = [u for u in game.units.values() if u.owner != player]
        if enemies:
            old = min(_distance(unit.pos, e.pos) for e in enemies)
            new = min(_distance(destination, e.pos) for e in enemies)
            f[8] = (old - new) / 5.0
        f[18] = 1.0
        f[20] = _exposure(game, player, destination)

    elif action.kind == "attack" and unit and target:
        damage = _effective_damage(target, unit.damage)
        if target.kind == "commander":
            f[1] = damage / 100.0
            if damage >= target.hp:
                f[4] = 1.0
        else:
            f[2] = damage / 100.0
            if damage >= target.hp:
                f[3] = 1.0
        f[18] = 2.0 if UNIT_SPECS[unit.kind].attack_type == "melee" and (action.x, action.y) != unit.pos else 1.0

    elif action.kind == "attack_log" and unit:
        tx, ty = (int(v) for v in action.card.split(","))
        hp = game.logs[(tx, ty)]
        f[2] = min(hp, unit.damage) / 150.0
        f[3] = 0.35 if unit.damage >= hp else 0.0
        f[18] = 2.0 if UNIT_SPECS[unit.kind].attack_type == "melee" and (action.x, action.y) != unit.pos else 1.0

    elif action.kind == "heal" and unit and target:
        cap = int(target.max_hp * 1.2) // 5 * 5
        f[9] = min(unit.damage, cap - target.hp) / 100.0
        f[18] = 1.0

    elif action.kind == "draw_unit":
        f[10] = 1.0 + (7 - len(game.players[player].hand)) * 0.05
        f[18] = 1.0
    elif action.kind == "draw_item":
        f[11] = 1.0 + (7 - len(game.players[player].hand)) * 0.05
        f[18] = 1.0

    elif action.kind == "deploy":
        spec = UNIT_SPECS[action.card]
        f[5] = spec.hp / 100.0
        f[6] = spec.damage / 50.0
        f[18] = spec.deploy_cost
        f[20] = _exposure(game, player, (action.x, action.y))

    elif action.kind == "item":
        f[18] = ITEM_COSTS[action.card]
        if action.card == "strength" and target:
            f[12] = 1.0 + (0.3 if target.kind == "freeze_mage" else 0.0)
        elif action.card == "freeze" and target:
            f[13] = (target.damage + target.hp * 0.2) / 60.0
        elif action.card == "action_block":
            f[13] = 3.0
        elif action.card in {"brain_power", "charm"} and target:
            value = (target.hp + target.damage * 2.0) / 100.0
            f[14] = value * (1.0 if action.card == "brain_power" else 0.45)
            if action.card == "brain_power":
                f[2] = min(30, target.hp) / 100.0
        elif action.card == "teleport" and target and enemy_commander:
            old = _distance(target.pos, enemy_commander.pos)
            new = _distance((action.x, action.y), enemy_commander.pos)
            f[17] = (old - new) / 5.0
            f[20] = _exposure(game, player, (action.x, action.y))
        elif action.card == "fireball":
            occupant = game.unit_at((action.x, action.y))
            if occupant:
                f[16] = 1.5 if occupant.owner != player else -2.0
            elif enemy_commander:
                f[16] = max(0.0, 1.0 - _distance((action.x, action.y), enemy_commander.pos) / 8.0)
        elif action.card == "meteorite":
            for occupant in game.units.values():
                if occupant.pos == (action.x, action.y):
                    value = min(40, occupant.hp) / 100.0
                    if occupant.kind == "commander":
                        f[1] += value if occupant.owner != player else -value
                    else:
                        f[15] += value if occupant.owner != player else -value
                    if occupant.hp <= 40 and occupant.owner != player:
                        f[3 if occupant.kind != "commander" else 4] = 1.0
    return f


@dataclass
class LinearAgent:
    weights: np.ndarray
    seed: int = 0
    exploration: float = 0.0
    name: str = "linear"

    def __post_init__(self) -> None:
        self.weights = np.asarray(self.weights, dtype=np.float64)
        if self.weights.shape != (len(FEATURE_NAMES),):
            raise ValueError(f"expected {len(FEATURE_NAMES)} weights, got {self.weights.shape}")
        self.rng = random.Random(self.seed)

    def choose_action(self, game: GameState) -> Action:
        actions = game.legal_actions()
        if not actions:
            raise ValueError("no legal actions")
        scored = [(float(np.dot(self.weights, action_features(game, action))), action) for action in actions]
        if self.exploration > 0 and self.rng.random() < self.exploration:
            # Explore among non-terminal actions when possible so self-play does
            # not collapse into premature end-turn loops.
            alternatives = [a for a in actions if a.kind != "end"]
            return self.rng.choice(alternatives or actions)
        best = max(score for score, _ in scored)
        choices = [action for score, action in scored if abs(score - best) < 1e-9]
        if self.exploration <= 0:
            return min(choices, key=lambda action: action.short())
        return self.rng.choice(choices)


@dataclass
class RandomAgent:
    seed: int = 0
    end_probability: float = 0.08
    name: str = "random"

    def __post_init__(self) -> None:
        self.rng = random.Random(self.seed)

    def choose_action(self, game: GameState) -> Action:
        actions = game.legal_actions()
        end = next((a for a in actions if a.kind == "end"), actions[0])
        others = [a for a in actions if a.kind != "end"]
        if not others or self.rng.random() < self.end_probability:
            return end
        return self.rng.choice(others)


def save_checkpoint(path: str | Path, weights: np.ndarray, **metadata) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "format": "grids-ai-linear-v1",
        "features": list(FEATURE_NAMES),
        "weights": {name: float(value) for name, value in zip(FEATURE_NAMES, weights)},
        **metadata,
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_checkpoint(path: str | Path) -> tuple[np.ndarray, dict]:
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if payload.get("format") != "grids-ai-linear-v1":
        raise ValueError("unsupported checkpoint format")
    stored = payload["weights"]
    weights = np.array([stored[name] for name in FEATURE_NAMES], dtype=np.float64)
    return weights, payload
