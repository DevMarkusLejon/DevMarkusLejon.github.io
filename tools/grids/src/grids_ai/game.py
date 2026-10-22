"""Deterministic, headless Grids match simulator.

The graphical GameMaker project is event-driven and network-relative.  This
module expresses the same match rules in canonical player-0/player-1 state so
that self-play can run quickly and reproducibly.
"""

from __future__ import annotations

import copy
import math
import random
from collections import deque
from dataclasses import dataclass, field
from typing import Iterable

from .rules import (
    BLOCKED_ACTIONS,
    COMMANDER_STARTS,
    HEIGHT,
    ITEM_COSTS,
    MAX_ACTIONS,
    MAX_HAND,
    OPENING_HAND,
    PLAIN_BLOCKS,
    PLAIN_LOGS,
    TRAINING_MAX_HALF_TURNS,
    UNIT_SPECS,
    WIDTH,
    default_item_deck,
    default_unit_deck,
)


@dataclass(frozen=True, slots=True)
class Action:
    kind: str
    unit_id: int = -1
    target_id: int = -1
    card: str = ""
    x: int = -1
    y: int = -1

    def short(self) -> str:
        parts = [self.kind]
        if self.card:
            parts.append(self.card)
        if self.unit_id >= 0:
            parts.append(f"u{self.unit_id}")
        if self.target_id >= 0:
            parts.append(f"->u{self.target_id}")
        if self.x >= 0:
            parts.append(f"@{self.x},{self.y}")
        return " ".join(parts)


@dataclass(slots=True)
class Unit:
    id: int
    kind: str
    owner: int
    x: int
    y: int
    hp: int
    max_hp: int
    damage: int
    armor: int = 0
    frozen: int = 0
    burning: int = 0
    attacked: set[int] = field(default_factory=set)
    charmed_from: int | None = None

    @classmethod
    def create(cls, uid: int, kind: str, owner: int, x: int, y: int) -> "Unit":
        spec = UNIT_SPECS[kind]
        return cls(uid, kind, owner, x, y, spec.hp, spec.hp, spec.damage)

    @property
    def pos(self) -> tuple[int, int]:
        return self.x, self.y


@dataclass(slots=True)
class PlayerState:
    hand: list[str]
    unit_deck: list[str]
    item_deck: list[str]
    blocked_turns: int = 0


@dataclass(slots=True)
class GameState:
    players: list[PlayerState]
    units: dict[int, Unit]
    logs: dict[tuple[int, int], int]
    fires: dict[tuple[int, int], int]
    current_player: int = 0
    actions_left: int = MAX_ACTIONS
    half_turn: int = 1
    next_unit_id: int = 2
    winner: int | None = None
    terminal_reason: str = ""
    max_half_turns: int | None = None
    seed: int = 0

    def clone(self) -> "GameState":
        return copy.deepcopy(self)

    @property
    def terminal(self) -> bool:
        return self.winner is not None or bool(self.terminal_reason)

    def unit_at(self, pos: tuple[int, int]) -> Unit | None:
        for unit in self.units.values():
            if unit.pos == pos:
                return unit
        return None

    def commander(self, player: int) -> Unit | None:
        return next(
            (u for u in self.units.values() if u.kind == "commander" and u.owner == player),
            None,
        )

    def occupied(self, pos: tuple[int, int], ignore_unit: int = -1) -> bool:
        if pos in PLAIN_BLOCKS or pos in self.logs:
            return True
        return any(u.id != ignore_unit and u.pos == pos for u in self.units.values())

    def inside(self, pos: tuple[int, int]) -> bool:
        x, y = pos
        return 0 <= x < WIDTH and 0 <= y < HEIGHT

    def reachable(self, unit: Unit) -> dict[tuple[int, int], int]:
        """Four-direction movement, matching mp_grid_path(..., allowdiag=0)."""
        limit = UNIT_SPECS[unit.kind].walk
        found = {unit.pos: 0}
        queue = deque([unit.pos])
        while queue:
            x, y = queue.popleft()
            distance = found[(x, y)]
            if distance >= limit:
                continue
            for nxt in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if (
                    nxt not in found
                    and self.inside(nxt)
                    and not self.occupied(nxt, ignore_unit=unit.id)
                ):
                    found[nxt] = distance + 1
                    queue.append(nxt)
        return found

    def _line_cells(self, start: tuple[int, int], end: tuple[int, int]) -> list[tuple[int, int]]:
        """Bresenham cells between endpoints, used for ranged collision_line."""
        x0, y0 = start
        x1, y1 = end
        cells: list[tuple[int, int]] = []
        dx = abs(x1 - x0)
        dy = -abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx + dy
        while True:
            cells.append((x0, y0))
            if (x0, y0) == (x1, y1):
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy
        return cells[1:-1]

    def has_line_of_sight(self, start: tuple[int, int], end: tuple[int, int]) -> bool:
        return all(not self.occupied(cell) for cell in self._line_cells(start, end))

    @staticmethod
    def _in_range(a: tuple[int, int], b: tuple[int, int], distance: int) -> bool:
        # GameMaker uses point_distance <= range + cellSize/2.
        return math.dist(a, b) <= distance + 0.5

    def _melee_destination(self, attacker: Unit, target: Unit | tuple[int, int]) -> tuple[int, int] | None:
        tx, ty = target.pos if isinstance(target, Unit) else target
        reachable = self.reachable(attacker)
        ordered = [
            (tx - 1, ty),
            (tx + 1, ty),
            (tx, ty - 1),
            (tx, ty + 1),
            (tx - 1, ty - 1),
            (tx - 1, ty + 1),
            (tx + 1, ty - 1),
            (tx + 1, ty + 1),
        ]
        candidates = [p for p in ordered if p in reachable]
        if not candidates:
            return None
        return min(candidates, key=lambda p: (math.dist(attacker.pos, p), ordered.index(p)))

    def _can_attack_pos(self, attacker: Unit, target_pos: tuple[int, int]) -> tuple[bool, tuple[int, int] | None]:
        spec = UNIT_SPECS[attacker.kind]
        if spec.attack_type == "melee":
            destination = self._melee_destination(attacker, target_pos)
            return destination is not None, destination
        if not self._in_range(attacker.pos, target_pos, spec.attack_range):
            return False, None
        if spec.attack_type == "ranged" and not self.has_line_of_sight(attacker.pos, target_pos):
            return False, None
        return spec.attack_type in {"ranged", "magic"}, None

    def legal_actions(self) -> list[Action]:
        if self.terminal:
            return []

        player = self.current_player
        result = [Action("end")]
        if self.actions_left <= 0:
            return result

        own_units = sorted((u for u in self.units.values() if u.owner == player), key=lambda u: u.id)
        enemy_units = sorted((u for u in self.units.values() if u.owner != player), key=lambda u: u.id)

        for unit in own_units:
            spec = UNIT_SPECS[unit.kind]
            if unit.frozen <= 0:
                for (x, y), distance in self.reachable(unit).items():
                    if distance:
                        result.append(Action("move", unit_id=unit.id, x=x, y=y))

                if spec.attack_type == "healer":
                    for target in own_units:
                        cap = int(target.max_hp * 1.2) // 5 * 5
                        if (
                            target.id != unit.id
                            and target.id not in unit.attacked
                            and target.hp < cap
                            and self._in_range(unit.pos, target.pos, spec.attack_range)
                        ):
                            result.append(Action("heal", unit_id=unit.id, target_id=target.id))
                else:
                    for target in enemy_units:
                        if target.id in unit.attacked:
                            continue
                        valid, destination = self._can_attack_pos(unit, target.pos)
                        if valid:
                            x, y = destination if destination is not None else (-1, -1)
                            if destination is not None and destination != unit.pos and self.actions_left < 2:
                                continue
                            result.append(
                                Action("attack", unit_id=unit.id, target_id=target.id, x=x, y=y)
                            )

                    # Destructible logs can be attacked repeatedly.
                    for target_pos in sorted(self.logs):
                        valid, destination = self._can_attack_pos(unit, target_pos)
                        if valid:
                            x, y = destination if destination is not None else target_pos
                            if destination is not None and destination != unit.pos and self.actions_left < 2:
                                continue
                            result.append(Action("attack_log", unit_id=unit.id, x=x, y=y, target_id=-1,
                                                 card=f"{target_pos[0]},{target_pos[1]}"))

        state = self.players[player]
        if len(state.hand) < MAX_HAND:
            if state.unit_deck:
                result.append(Action("draw_unit"))
            if state.item_deck:
                result.append(Action("draw_item"))

        deploy_x = 0 if player == 0 else WIDTH - 1
        for card in sorted(set(state.hand)):
            if card in UNIT_SPECS and UNIT_SPECS[card].deploy_cost <= self.actions_left:
                for y in range(HEIGHT):
                    if not self.occupied((deploy_x, y)):
                        result.append(Action("deploy", card=card, x=deploy_x, y=y))
            elif card in ITEM_COSTS and ITEM_COSTS[card] <= self.actions_left:
                result.extend(self._item_actions(card, own_units, enemy_units))
        return result

    def _item_actions(
        self, card: str, own_units: list[Unit], enemy_units: list[Unit]
    ) -> list[Action]:
        actions: list[Action] = []
        if card == "strength":
            actions.extend(Action("item", card=card, target_id=u.id) for u in own_units if UNIT_SPECS[u.kind].buffable and u.frozen <= 0)
        elif card == "freeze":
            actions.extend(Action("item", card=card, target_id=u.id) for u in enemy_units if u.frozen <= 0)
        elif card == "action_block":
            if self.players[1 - self.current_player].blocked_turns <= 0:
                actions.append(Action("item", card=card))
        elif card == "brain_power":
            actions.extend(Action("item", card=card, target_id=u.id) for u in enemy_units if u.kind != "commander")
        elif card == "charm":
            actions.extend(Action("item", card=card, target_id=u.id) for u in enemy_units if u.kind != "commander")
        elif card == "teleport":
            for unit in own_units:
                for y in range(HEIGHT):
                    for x in range(WIDTH):
                        if not self.occupied((x, y), ignore_unit=unit.id) and (x, y) != unit.pos:
                            actions.append(Action("item", card=card, target_id=unit.id, x=x, y=y))
        elif card == "fireball":
            for y in range(HEIGHT):
                for x in range(WIDTH):
                    if (x, y) not in PLAIN_BLOCKS and (x, y) not in self.logs and (x, y) not in self.fires:
                        actions.append(Action("item", card=card, x=x, y=y))
        elif card == "meteorite":
            for y in range(HEIGHT):
                for x in range(WIDTH):
                    if (x, y) not in PLAIN_BLOCKS:
                        actions.append(Action("item", card=card, x=x, y=y))
        return actions

    def step(self, action: Action, *, validate: bool = True) -> None:
        if self.terminal:
            raise ValueError("cannot act in a terminal game")
        if validate and action not in self.legal_actions():
            raise ValueError(f"illegal action: {action.short()}")

        if action.kind == "end":
            self._end_turn()
        elif action.kind == "move":
            unit = self.units[action.unit_id]
            self._relocate(unit, action.x, action.y)
            self.actions_left -= 1
        elif action.kind in {"attack", "attack_log"}:
            attacker = self.units[action.unit_id]
            melee_move = UNIT_SPECS[attacker.kind].attack_type == "melee" and (action.x, action.y) != attacker.pos
            self._attack(action)
            self.actions_left -= 2 if melee_move else 1
        elif action.kind == "heal":
            healer = self.units[action.unit_id]
            target = self.units[action.target_id]
            cap = int(target.max_hp * 1.2) // 5 * 5
            target.hp = min(cap, target.hp + healer.damage)
            healer.attacked.add(target.id)
            self.actions_left -= 1
        elif action.kind == "draw_unit":
            self._draw("unit")
        elif action.kind == "draw_item":
            self._draw("item")
        elif action.kind == "deploy":
            self._consume_card(action.card)
            spec = UNIT_SPECS[action.card]
            self.actions_left -= spec.deploy_cost
            self._spawn(action.card, self.current_player, action.x, action.y)
        elif action.kind == "item":
            self._use_item(action)
        else:
            raise ValueError(f"unknown action kind: {action.kind}")

        if not self.terminal and self.actions_left < 0:
            raise AssertionError("action accounting went negative")

    def _spawn(self, kind: str, owner: int, x: int, y: int) -> Unit:
        unit = Unit.create(self.next_unit_id, kind, owner, x, y)
        self.units[unit.id] = unit
        self.next_unit_id += 1
        self._relocate(unit, x, y)
        return unit

    def _relocate(self, unit: Unit, x: int, y: int) -> None:
        unit.x, unit.y = x, y
        if unit.pos in self.fires:
            unit.burning = max(unit.burning, 2)

    def _draw(self, deck_type: str) -> None:
        state = self.players[self.current_player]
        deck = state.unit_deck if deck_type == "unit" else state.item_deck
        if len(state.hand) >= MAX_HAND or not deck:
            raise ValueError("cannot draw from this deck")
        state.hand.append(deck.pop(0))
        self.actions_left -= 1

    def _consume_card(self, card: str) -> None:
        self.players[self.current_player].hand.remove(card)

    def _attack(self, action: Action) -> None:
        attacker = self.units[action.unit_id]
        target_pos: tuple[int, int]
        target: Unit | None = None
        if action.kind == "attack":
            target = self.units[action.target_id]
            target_pos = target.pos
        else:
            lx, ly = (int(v) for v in action.card.split(","))
            target_pos = (lx, ly)

        spec = UNIT_SPECS[attacker.kind]
        if spec.attack_type == "melee":
            self._relocate(attacker, action.x, action.y)

        if target is not None:
            target_id = target.id
            attacker.attacked.add(target_id)
            self._damage_unit(target_id, attacker.damage)
            target = self.units.get(target_id)
            if target is not None:
                if attacker.kind == "freeze_mage":
                    target.frozen = max(target.frozen, 2)
                if spec.knockback:
                    self._knockback(target, attacker.pos, spec.knockback)
        else:
            hp = self.logs[target_pos] - attacker.damage
            if hp <= 0:
                del self.logs[target_pos]
            else:
                self.logs[target_pos] = hp

        if attacker.kind == "freeze_mage":
            # Original user event 5 marks every currently existing unit.
            attacker.attacked.update(self.units)

    def _damage_unit(self, unit_id: int, damage: int) -> None:
        unit = self.units.get(unit_id)
        if unit is None:
            return
        absorbed = min(unit.armor, damage)
        unit.armor -= absorbed
        unit.hp -= damage - absorbed
        if unit.hp > 0:
            return
        was_commander = unit.kind == "commander"
        owner = unit.owner
        del self.units[unit_id]
        if was_commander:
            self.winner = 1 - owner
            self.terminal_reason = "commander defeated"

    def _knockback(self, target: Unit, attacker_pos: tuple[int, int], amount: int) -> None:
        if not UNIT_SPECS[target.kind].moveable:
            return
        dx = target.x - attacker_pos[0]
        dy = target.y - attacker_pos[1]
        if dx == 0 and dy == 0:
            return
        if dx and dy and abs(dx) == abs(dy):
            step = (_sign(dx), _sign(dy))
        elif abs(dx) >= abs(dy):
            step = (_sign(dx), 0)
        else:
            step = (0, _sign(dy))
        destination = (target.x + step[0] * amount, target.y + step[1] * amount)
        if self.inside(destination) and not self.occupied(destination, ignore_unit=target.id):
            self._relocate(target, *destination)

    def _use_item(self, action: Action) -> None:
        card = action.card
        self._consume_card(card)
        self.actions_left -= ITEM_COSTS[card]
        player = self.current_player

        if card == "strength":
            self.units[action.target_id].damage += 10
        elif card == "freeze":
            self.units[action.target_id].frozen = max(self.units[action.target_id].frozen, 4)
        elif card == "action_block":
            self.players[1 - player].blocked_turns = 4
        elif card == "brain_power":
            target = self.units[action.target_id]
            target.owner = player
            target.charmed_from = None
            self._damage_unit(target.id, 30)
        elif card == "charm":
            target = self.units[action.target_id]
            target.charmed_from = target.owner
            target.owner = player
        elif card == "teleport":
            target = self.units[action.target_id]
            self._relocate(target, action.x, action.y)
        elif card == "fireball":
            self.fires[(action.x, action.y)] = 4
            target = self.unit_at((action.x, action.y))
            if target is not None:
                target.burning = max(target.burning, 2)
        elif card == "meteorite":
            center = (action.x, action.y)
            target = self.unit_at(center)
            if target is not None:
                self._damage_unit(target.id, 40)
            elif center in self.logs:
                remaining = self.logs[center] - 40
                if remaining <= 0:
                    del self.logs[center]
                else:
                    self.logs[center] = remaining
            for unit in list(self.units.values()):
                if unit.id in self.units and max(abs(unit.x - action.x), abs(unit.y - action.y)) <= 1:
                    self._knockback(unit, center, 1)

    def _end_turn(self) -> None:
        actor = self.current_player
        for unit in self.units.values():
            if unit.owner == actor:
                unit.attacked.clear()

        # Charm is explicitly reset when the next player's turn begins.
        for unit in self.units.values():
            if unit.charmed_from is not None:
                unit.owner = unit.charmed_from
                unit.charmed_from = None

        self.half_turn += 1
        if self.max_half_turns is not None and self.half_turn > self.max_half_turns:
            commanders = [self.commander(player) for player in (0, 1)]
            scores = [unit.hp if unit else 0 for unit in commanders]
            self.winner = 0 if scores[0] > scores[1] else 1 if scores[1] > scores[0] else -1
            self.terminal_reason = "match turn limit"
            return

        # Fire and burn resolve once per half-turn in scr_fire.gml.
        for unit in list(self.units.values()):
            if unit.id not in self.units:
                continue
            if unit.pos in self.fires:
                unit.burning = max(unit.burning, 2)
                self._damage_unit(unit.id, 15)
            elif unit.burning > 0:
                unit.burning -= 1
                self._damage_unit(unit.id, 10)

        self.fires = {pos: hp - 1 for pos, hp in self.fires.items() if hp - 1 > 0}
        for unit in self.units.values():
            unit.frozen = max(0, unit.frozen - 1)

        for player in self.players:
            player.blocked_turns = max(0, player.blocked_turns - 1)

        if self.terminal:
            return
        self.current_player = 1 - actor
        blocked = self.players[self.current_player].blocked_turns > 0
        self.actions_left = BLOCKED_ACTIONS if blocked else MAX_ACTIONS

    def _finish_on_score(self) -> None:
        scores = []
        for player in (0, 1):
            commander = self.commander(player)
            commander_hp = commander.hp if commander else 0
            army_hp = sum(u.hp + u.armor for u in self.units.values() if u.owner == player and u.kind != "commander")
            scores.append(commander_hp * 10 + army_hp)
        if scores[0] > scores[1]:
            self.winner = 0
        elif scores[1] > scores[0]:
            self.winner = 1
        else:
            self.winner = -1
        self.terminal_reason = "training turn cap"

    def material_score(self, player: int) -> float:
        total = 0.0
        for unit in self.units.values():
            sign = 1.0 if unit.owner == player else -1.0
            commander_scale = 4.0 if unit.kind == "commander" else 1.0
            total += sign * commander_scale * (unit.hp + unit.armor + unit.damage * 0.75)
        return total

    def describe_action(self, action: Action) -> str:
        if action.kind == "end":
            return "End turn"
        if action.kind == "draw_unit":
            return "Draw a unit card (1 action)"
        if action.kind == "draw_item":
            return "Draw an item card (1 action)"
        unit = self.units.get(action.unit_id)
        target = self.units.get(action.target_id)
        if action.kind == "move" and unit:
            return f"Move {unit.kind} #{unit.id} to ({action.x},{action.y})"
        if action.kind == "attack" and unit and target:
            return f"Attack {target.kind} #{target.id} with {unit.kind} #{unit.id}"
        if action.kind == "attack_log" and unit:
            return f"Attack log {action.card} with {unit.kind} #{unit.id}"
        if action.kind == "heal" and unit and target:
            return f"Heal {target.kind} #{target.id} with {unit.kind} #{unit.id}"
        if action.kind == "deploy":
            return f"Deploy {action.card} at ({action.x},{action.y})"
        if action.kind == "item":
            suffix = f" on {target.kind} #{target.id}" if target else ""
            if action.x >= 0:
                suffix += f" at ({action.x},{action.y})"
            return f"Use {action.card}{suffix}"
        return action.short()


def _sign(value: int) -> int:
    return (value > 0) - (value < 0)


def _opening_draw(rng: random.Random, units: list[str], items: list[str]) -> list[str]:
    hand: list[str] = []
    while len(hand) < OPENING_HAND:
        choose_units = bool(rng.randrange(2))
        source = units if choose_units else items
        if not source:
            source = items if choose_units else units
        hand.append(source.pop(0))
    return hand


def _player_from_rng(rng: random.Random) -> PlayerState:
    units = default_unit_deck()
    items = default_item_deck()
    rng.shuffle(units)
    rng.shuffle(items)
    return PlayerState(_opening_draw(rng, units, items), units, items)


def independent_player_seeds(
    host_seed: int,
    guest_seed: int | None = None,
) -> tuple[int, int]:
    """Return deterministic, independent private-deck seeds for live-style play."""
    return (
        host_seed,
        host_seed + 1_000_003 if guest_seed is None else guest_seed,
    )


def new_game(
    seed: int = 0,
    *,
    starting_player: int = 0,
    max_half_turns: int | None = None,
    player_seeds: tuple[int, int] | None = None,
) -> GameState:
    if player_seeds is None:
        rng = random.Random(seed)
        players = [_player_from_rng(rng) for _ in range(2)]
    else:
        # Each seed reproduces the named player's private state from a normal
        # game created with that seed. This lets live-guest evaluation vary the
        # unknown host deck while holding the bot's real deck sequence fixed.
        players = []
        for player, player_seed in enumerate(player_seeds):
            rng = random.Random(player_seed)
            state = None
            for _ in range(player + 1):
                state = _player_from_rng(rng)
            assert state is not None
            players.append(state)

    units = {
        0: Unit.create(0, "commander", 0, *COMMANDER_STARTS[0]),
        1: Unit.create(1, "commander", 1, *COMMANDER_STARTS[1]),
    }
    return GameState(
        players=players,
        units=units,
        logs=dict(PLAIN_LOGS),
        fires={},
        current_player=starting_player,
        max_half_turns=max_half_turns,
        seed=seed,
    )


def play_match(
    agent0,
    agent1,
    *,
    seed: int = 0,
    max_half_turns: int = TRAINING_MAX_HALF_TURNS,
    player_seeds: tuple[int, int] | None = None,
) -> GameState:
    game = new_game(
        seed,
        max_half_turns=None,
        player_seeds=player_seeds,
    )
    agents = (agent0, agent1)
    primitive_steps = 0
    while not game.terminal:
        action = agents[game.current_player].choose_action(game)
        game.step(action)
        primitive_steps += 1
        if not game.terminal and (
            game.half_turn > max_half_turns
            or primitive_steps > max_half_turns * (MAX_ACTIONS + 2)
        ):
            game._finish_on_score()
    return game


def board_rows(game: GameState) -> Iterable[str]:
    unit_symbols = {
        "commander": "C",
        "warrior": "W",
        "archer": "A",
        "freeze_mage": "F",
        "viking": "V",
        "assassin": "S",
        "healer": "H",
        "ninja": "N",
    }
    for y in range(HEIGHT):
        cells: list[str] = []
        for x in range(WIDTH):
            pos = (x, y)
            unit = game.unit_at(pos)
            if unit:
                symbol = unit_symbols[unit.kind]
                cells.append(symbol if unit.owner == 0 else symbol.lower())
            elif pos in PLAIN_BLOCKS:
                cells.append("#")
            elif pos in game.logs:
                cells.append("L")
            elif pos in game.fires:
                cells.append("*")
            else:
                cells.append(".")
        yield " ".join(cells)
