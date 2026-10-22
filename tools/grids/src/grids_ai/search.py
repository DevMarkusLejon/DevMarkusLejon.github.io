"""Fair-information turn search for stronger tactical play.

Search is intentionally confined to the acting player's current turn. This
allows combinations such as buff-then-attack or move-then-shoot while avoiding
any use of the opponent's hidden hand. A draw ends the current plan because the
next card is unknown until the draw has happened.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .agents import BASE_WEIGHTS, LinearAgent, action_features
from .game import Action, GameState
from .rules import HEIGHT, MAX_ACTIONS, UNIT_SPECS, WIDTH


STATE_FEATURE_NAMES = (
    "commander_ehp_difference",
    "army_ehp_difference",
    "army_damage_difference",
    "army_count_difference",
    "disabled_difference",
    "burning_difference",
    "blocked_turn_difference",
    "advancement_difference",
    "own_hand_size",
    "commander_attack_capacity_difference",
    "commander_lethal_balance",
    "commander_guard_difference",
    "commander_mobility_difference",
)

# The first nine values exactly reproduce the original handcrafted
# public_value formula. The final four tactical terms default to zero, so old
# checkpoints retain identical decisions until evaluator training explicitly
# supplies state weights.
BASE_STATE_WEIGHTS = np.array(
    [12.0, 1.0, 1.6, 30.0, 24.0, 10.0, 18.0, 1.0, 8.0, 0.0, 0.0, 0.0, 0.0],
    dtype=np.float64,
)

LEGACY_SEARCH_PROFILE = {
    "beam_width": 12,
    "branch_width": 10,
    "response_width": 14,
    "response_beam_width": 0,
    "override_margin": 120.0,
}


def search_profile_from_metadata(metadata: dict) -> dict:
    """Load deployment search settings while preserving v1/v2 behavior."""
    stored = metadata.get("search", {})
    profile = LEGACY_SEARCH_PROFILE.copy()
    for key in profile:
        if key in stored:
            profile[key] = stored[key]
    for key in ("beam_width", "branch_width", "response_width"):
        profile[key] = int(profile[key])
        if profile[key] < 1:
            raise ValueError(f"search profile {key} must be positive")
    profile["response_beam_width"] = int(profile["response_beam_width"])
    if profile["response_beam_width"] < 0:
        raise ValueError("search profile response_beam_width cannot be negative")
    profile["override_margin"] = float(profile["override_margin"])
    return profile


def public_state_key(game: GameState, player: int) -> tuple:
    """Fingerprint excluding opponent hand contents and both deck orders."""
    units = tuple(
        sorted(
            (
                u.id,
                u.kind,
                u.owner,
                u.x,
                u.y,
                u.hp,
                u.max_hp,
                u.damage,
                u.armor,
                u.frozen,
                u.burning,
                tuple(sorted(u.attacked)),
                u.charmed_from,
            )
            for u in game.units.values()
        )
    )
    own = game.players[player]
    return (
        game.current_player,
        game.actions_left,
        game.half_turn,
        game.winner,
        units,
        tuple(sorted(game.logs.items())),
        tuple(sorted(game.fires.items())),
        tuple(sorted(own.hand)),
        len(own.unit_deck),
        len(own.item_deck),
        game.players[0].blocked_turns,
        game.players[1].blocked_turns,
    )


def _commander_attack_capacity(
    game: GameState,
    attacker: int,
    reachable_cache: dict[int, dict[tuple[int, int], int]] | None = None,
) -> float:
    """Maximum visible-board damage the player could deal to the commander.

    This intentionally ignores hidden cards. It uses a small 0/1 knapsack over
    units that can already attack or can move-and-attack next turn.
    """
    target = game.commander(1 - attacker)
    if target is None:
        return 100_000.0
    actions = 4 if game.players[attacker].blocked_turns > 0 else MAX_ACTIONS
    attacks: list[tuple[int, int]] = []
    for unit in game.units.values():
        if unit.owner != attacker or unit.frozen > 0:
            continue
        spec = UNIT_SPECS[unit.kind]
        if spec.attack_type == "healer" or target.id in unit.attacked:
            continue
        if spec.attack_type == "melee" and reachable_cache is not None:
            if unit.id not in reachable_cache:
                reachable_cache[unit.id] = game.reachable(unit)
            reachable = reachable_cache[unit.id]
            tx, ty = target.pos
            ordered = (
                (tx - 1, ty),
                (tx + 1, ty),
                (tx, ty - 1),
                (tx, ty + 1),
                (tx - 1, ty - 1),
                (tx - 1, ty + 1),
                (tx + 1, ty - 1),
                (tx + 1, ty + 1),
            )
            destinations = [position for position in ordered if position in reachable]
            destination = (
                min(
                    destinations,
                    key=lambda position: (
                        np.hypot(unit.x - position[0], unit.y - position[1]),
                        ordered.index(position),
                    ),
                )
                if destinations
                else None
            )
            valid = destination is not None
        else:
            valid, destination = game._can_attack_pos(unit, target.pos)
        if not valid:
            continue
        cost = (
            2
            if spec.attack_type == "melee"
            and destination is not None
            and destination != unit.pos
            else 1
        )
        attacks.append((cost, unit.damage))

    best = [0] * (actions + 1)
    for cost, damage in attacks:
        for budget in range(actions, cost - 1, -1):
            best[budget] = max(best[budget], best[budget - cost] + damage)
    return float(best[actions])


def public_state_features(
    game: GameState,
    player: int,
    *,
    tactical: bool = True,
) -> np.ndarray:
    """Return public, perspective-relative board features."""
    features = np.zeros(len(STATE_FEATURE_NAMES), dtype=np.float64)
    own_commander = game.commander(player)
    enemy_commander = game.commander(1 - player)
    own_cmd_hp = own_commander.hp + own_commander.armor if own_commander else 0
    enemy_cmd_hp = enemy_commander.hp + enemy_commander.armor if enemy_commander else 0
    features[0] = own_cmd_hp - enemy_cmd_hp

    own_units = [
        unit
        for unit in game.units.values()
        if unit.owner == player and unit.kind != "commander"
    ]
    enemy_units = [
        unit
        for unit in game.units.values()
        if unit.owner != player and unit.kind != "commander"
    ]
    features[1] = sum(unit.hp + unit.armor for unit in own_units) - sum(
        unit.hp + unit.armor for unit in enemy_units
    )
    features[2] = sum(unit.damage for unit in own_units) - sum(
        unit.damage for unit in enemy_units
    )
    features[3] = len(own_units) - len(enemy_units)
    features[4] = sum(unit.frozen > 0 for unit in enemy_units) - sum(
        unit.frozen > 0 for unit in own_units
    )
    features[5] = sum(unit.burning > 0 for unit in enemy_units) - sum(
        unit.burning > 0 for unit in own_units
    )
    features[6] = (
        game.players[1 - player].blocked_turns
        - game.players[player].blocked_turns
    )

    advancement = 0.0
    if enemy_commander:
        for unit in own_units:
            distance = abs(unit.x - enemy_commander.x) + abs(
                unit.y - enemy_commander.y
            )
            advancement += (WIDTH + HEIGHT - distance) * (
                3.0 + unit.damage / 40.0
            )
    if own_commander:
        for unit in enemy_units:
            distance = abs(unit.x - own_commander.x) + abs(
                unit.y - own_commander.y
            )
            advancement -= (WIDTH + HEIGHT - distance) * (
                3.0 + unit.damage / 40.0
            )
    features[7] = advancement
    # Only the acting player's own hand is private information available here.
    features[8] = len(game.players[player].hand)

    if tactical and own_commander and enemy_commander:
        reachable_cache: dict[int, dict[tuple[int, int], int]] = {}
        own_capacity = _commander_attack_capacity(
            game,
            player,
            reachable_cache,
        )
        enemy_capacity = _commander_attack_capacity(
            game,
            1 - player,
            reachable_cache,
        )
        features[9] = own_capacity - enemy_capacity
        features[10] = float(own_capacity >= enemy_cmd_hp) - float(
            enemy_capacity >= own_cmd_hp
        )
        features[11] = sum(
            abs(unit.x - own_commander.x) + abs(unit.y - own_commander.y) <= 2
            for unit in own_units
        ) - sum(
            abs(unit.x - enemy_commander.x) + abs(unit.y - enemy_commander.y)
            <= 2
            for unit in enemy_units
        )
        if own_commander.id not in reachable_cache:
            reachable_cache[own_commander.id] = game.reachable(own_commander)
        if enemy_commander.id not in reachable_cache:
            reachable_cache[enemy_commander.id] = game.reachable(enemy_commander)
        own_reachable = reachable_cache[own_commander.id]
        enemy_reachable = reachable_cache[enemy_commander.id]
        features[12] = len(own_reachable) - len(enemy_reachable)
    return features


def state_weights_from_metadata(metadata: dict) -> np.ndarray:
    """Load optional evaluator weights while supporting all v1/v2 models."""
    stored = metadata.get("state_weights")
    if stored is None:
        return BASE_STATE_WEIGHTS.copy()
    return np.array(
        [stored[name] for name in STATE_FEATURE_NAMES],
        dtype=np.float64,
    )


def public_value(
    game: GameState,
    player: int,
    state_weights: np.ndarray | None = None,
) -> float:
    """Evaluate public board state from one player's perspective."""
    if game.winner == player:
        return 100_000.0
    if game.winner == 1 - player:
        return -100_000.0
    if game.winner == -1:
        return 0.0

    weights = (
        BASE_STATE_WEIGHTS
        if state_weights is None
        else np.asarray(state_weights, dtype=np.float64)
    )
    if weights.shape != (len(STATE_FEATURE_NAMES),):
        raise ValueError(
            f"expected {len(STATE_FEATURE_NAMES)} state weights, got {weights.shape}"
        )
    tactical = bool(np.any(weights[9:] != 0.0))
    return float(
        np.dot(weights, public_state_features(game, player, tactical=tactical))
    )


@dataclass(slots=True)
class _Node:
    game: GameState
    sequence: tuple[Action, ...]
    prior: float
    score: float
    planning_boundary: bool = False


@dataclass
class TurnSearchAgent:
    """Beam-search a complete turn using learned linear action priors."""

    weights: np.ndarray = field(default_factory=lambda: BASE_WEIGHTS.copy())
    response_weights: np.ndarray | None = None
    state_weights: np.ndarray = field(
        default_factory=lambda: BASE_STATE_WEIGHTS.copy()
    )
    beam_width: int = 18
    branch_width: int = 14
    prior_scale: float = 7.0
    response_width: int = 18
    response_beam_width: int = 0
    response_branch_width: int = 5
    override_margin: float = 240.0
    seed: int = 0
    name: str = "turn-search"

    def __post_init__(self) -> None:
        self.weights = np.asarray(self.weights, dtype=np.float64)
        if self.response_weights is None:
            self.response_weights = self.weights.copy()
        else:
            self.response_weights = np.asarray(
                self.response_weights,
                dtype=np.float64,
            )
        if self.response_weights.shape != self.weights.shape:
            raise ValueError(
                f"response weights must have shape {self.weights.shape}, "
                f"got {self.response_weights.shape}"
            )
        self.state_weights = np.asarray(self.state_weights, dtype=np.float64)
        if self.state_weights.shape != (len(STATE_FEATURE_NAMES),):
            raise ValueError(
                f"expected {len(STATE_FEATURE_NAMES)} state weights, "
                f"got {self.state_weights.shape}"
            )
        self._prior_agent = LinearAgent(self.weights, seed=self.seed)
        self._cached: list[tuple[tuple, Action]] = []
        self._value_cache: dict[tuple, float] = {}

    def _value(self, game: GameState, player: int) -> float:
        key = (player, public_state_key(game, player))
        cached = self._value_cache.get(key)
        if cached is not None:
            return cached
        value = public_value(game, player, self.state_weights)
        self._value_cache[key] = value
        return value

    def choose_action(self, game: GameState) -> Action:
        player = game.current_player
        key = public_state_key(game, player)
        if self._cached and self._cached[0][0] == key:
            _, action = self._cached.pop(0)
            return action

        sequence = self.plan_turn(game)
        if not sequence:
            return Action("end")
        self._cache_sequence(game, player, sequence)
        _, action = self._cached.pop(0)
        return action

    def _cache_sequence(self, game: GameState, player: int, sequence: tuple[Action, ...]) -> None:
        simulated = game.clone()
        cached: list[tuple[tuple, Action]] = []
        for action in sequence:
            cached.append((public_state_key(simulated, player), action))
            simulated.step(action, validate=False)
            if action.kind in {"draw_unit", "draw_item"}:
                break
            if simulated.terminal or simulated.current_player != player:
                break
        self._cached = cached

    def _ranked_actions(self, game: GameState) -> list[tuple[float, Action]]:
        ranked = [
            (float(np.dot(self.weights, action_features(game, action))), action)
            for action in game.legal_actions()
        ]
        ranked.sort(key=lambda pair: (-pair[0], pair[1].short()))

        # Preserve tactical variety so large teleport/fireball target sets do
        # not crowd every other action family out of the beam.
        selected: list[tuple[float, Action]] = []
        family_counts: dict[tuple, int] = {}
        for pair in ranked:
            action = pair[1]
            family = (action.kind, action.card, action.unit_id)
            limit = 4 if action.kind in {"move", "item"} else 3
            if family_counts.get(family, 0) >= limit:
                continue
            family_counts[family] = family_counts.get(family, 0) + 1
            selected.append(pair)
            if len(selected) >= self.branch_width:
                break
        end = next((pair for pair in ranked if pair[1].kind == "end"), None)
        if end and all(action.kind != "end" for _, action in selected):
            selected.append(end)
        return selected

    def plan_turn(self, game: GameState) -> tuple[Action, ...]:
        root, actor, completed, baseline = self._enumerate_turns(game)
        if not completed:
            return (Action("end"),)
        finalists = completed[: self.response_width]
        finalists.append(baseline)
        for node in finalists:
            node.score = self._after_public_response(node.game, actor) + self.prior_scale * node.prior
        baseline_score = baseline.score
        best = max(finalists, key=lambda node: (node.score, tuple(a.short() for a in node.sequence)))
        wins_now = best.game.winner == actor
        if best is baseline or wins_now or best.score >= baseline_score + self.override_margin:
            return best.sequence
        return baseline.sequence

    def candidate_turns(self, game: GameState, limit: int = 10) -> list[tuple[Action, ...]]:
        """Return strong, diverse public-information turn plans for rollout.

        At most one plan for each distinct first action is selected initially,
        preventing a large target family from crowding every alternative out.
        The greedy baseline is always represented in the candidate pool.
        """
        if limit < 1:
            raise ValueError("limit must be positive")
        _root, actor, completed, baseline = self._enumerate_turns(game)
        pool = completed[: max(self.response_width, limit * 4)] + [baseline]
        unique: dict[tuple[Action, ...], _Node] = {}
        for node in pool:
            node.score = self._after_public_response(node.game, actor) + self.prior_scale * node.prior
            previous = unique.get(node.sequence)
            if previous is None or node.score > previous.score:
                unique[node.sequence] = node
        ranked = sorted(
            unique.values(),
            key=lambda node: (-node.score, tuple(action.short() for action in node.sequence)),
        )

        selected: list[_Node] = []
        first_actions: set[Action] = set()
        for node in ranked:
            first = node.sequence[0] if node.sequence else Action("end")
            if first in first_actions:
                continue
            selected.append(node)
            first_actions.add(first)
            if len(selected) >= limit:
                break
        if len(selected) < limit:
            for node in ranked:
                if node in selected:
                    continue
                selected.append(node)
                if len(selected) >= limit:
                    break
        return [node.sequence for node in selected]

    def _enumerate_turns(
        self, game: GameState
    ) -> tuple[GameState, int, list[_Node], _Node]:
        actor = game.current_player
        root = game.clone()
        beam = [_Node(root, (), 0.0, self._value(root, actor))]
        completed: list[_Node] = []

        for _depth in range(MAX_ACTIONS + 1):
            expanded: list[_Node] = []
            for node in beam:
                if node.game.terminal or node.game.current_player != actor or node.planning_boundary:
                    completed.append(node)
                    continue
                for prior, action in self._ranked_actions(node.game):
                    successor = node.game.clone()
                    successor.step(action, validate=False)
                    sequence = node.sequence + (action,)
                    cumulative_prior = node.prior + prior
                    boundary = action.kind in {"draw_unit", "draw_item"}
                    score = self._value(successor, actor) + self.prior_scale * cumulative_prior
                    child = _Node(successor, sequence, cumulative_prior, score, boundary)
                    if boundary or successor.terminal or successor.current_player != actor:
                        completed.append(child)
                    else:
                        expanded.append(child)
            if not expanded:
                break
            expanded.sort(key=lambda node: (-node.score, tuple(a.short() for a in node.sequence)))
            beam = expanded[: self.beam_width]

        # Force any surviving partial plans to end their turn before comparison.
        for node in beam:
            successor = node.game.clone()
            end = Action("end")
            successor.step(end, validate=False)
            sequence = node.sequence + (end,)
            completed.append(
                _Node(
                    successor,
                    sequence,
                    node.prior,
                    self._value(successor, actor) + self.prior_scale * node.prior,
                )
            )

        completed.sort(key=lambda node: (-node.score, tuple(a.short() for a in node.sequence)))
        baseline = self._baseline_turn(root, actor)
        return root, actor, completed, baseline

    def _baseline_turn(self, game: GameState, actor: int) -> _Node:
        """Explicitly retain the proven greedy policy as a safe fallback."""
        simulated = game.clone()
        sequence: list[Action] = []
        cumulative_prior = 0.0
        for _ in range(MAX_ACTIONS + 1):
            if simulated.terminal or simulated.current_player != actor:
                break
            ranked = self._ranked_actions(simulated)
            best_prior = max(score for score, _ in ranked)
            action = min(
                (action for score, action in ranked if abs(score - best_prior) < 1e-9),
                key=lambda candidate: candidate.short(),
            )
            sequence.append(action)
            cumulative_prior += best_prior
            simulated.step(action, validate=False)
            if action.kind in {"draw_unit", "draw_item"}:
                break
        return _Node(
            simulated,
            tuple(sequence),
            cumulative_prior,
            self._value(simulated, actor) + self.prior_scale * cumulative_prior,
        )

    def _after_public_response(self, game: GameState, actor: int) -> float:
        """Roll out only the opponent actions knowable from the public board.

        Hidden-hand actions, deployments, and draws are deliberately excluded.
        This captures immediate move/attack/heal replies without leaking cards.
        """
        if game.terminal or game.current_player == actor:
            return self._value(game, actor)
        if self.response_beam_width > 0:
            return self._after_public_response_beam(game, actor)
        simulated = game.clone()
        responder = simulated.current_player
        public_kinds = {"move", "attack", "attack_log", "heal", "end"}
        for _ in range(MAX_ACTIONS + 1):
            if simulated.terminal or simulated.current_player != responder:
                break
            actions = [a for a in simulated.legal_actions() if a.kind in public_kinds]
            if not actions:
                action = Action("end")
            else:
                ranked = [
                    (
                        float(
                            np.dot(
                                self.response_weights,
                                action_features(simulated, action),
                            )
                        ),
                        action,
                    )
                    for action in actions
                ]
                best_score = max(score for score, _ in ranked)
                action = min(
                    (action for score, action in ranked if abs(score - best_score) < 1e-9),
                    key=lambda candidate: candidate.short(),
                )
            simulated.step(action, validate=False)
        return self._value(simulated, actor)

    def _after_public_response_beam(self, game: GameState, actor: int) -> float:
        """Search a compact best public-board reply for the opponent."""
        responder = game.current_player
        public_kinds = {"move", "attack", "attack_log", "heal", "end"}
        root = game.clone()
        beam = [_Node(root, (), 0.0, self._value(root, responder))]
        completed: list[_Node] = []

        for _depth in range(MAX_ACTIONS + 1):
            expanded: list[_Node] = []
            for node in beam:
                if node.game.terminal or node.game.current_player != responder:
                    completed.append(node)
                    continue
                actions = [
                    action
                    for action in node.game.legal_actions()
                    if action.kind in public_kinds
                ]
                if not actions:
                    actions = [Action("end")]
                ranked: list[tuple[float, Action, GameState]] = []
                for action in actions:
                    successor = node.game.clone()
                    successor.step(action, validate=False)
                    prior = float(
                        np.dot(
                            self.response_weights,
                            action_features(node.game, action),
                        )
                    )
                    score = self._value(successor, responder) + self.prior_scale * (
                        node.prior + prior
                    )
                    ranked.append((score, action, successor))
                ranked.sort(key=lambda item: (-item[0], item[1].short()))
                for score, action, successor in ranked[: self.response_branch_width]:
                    child = _Node(
                        successor,
                        node.sequence + (action,),
                        node.prior
                        + float(
                            np.dot(
                                self.response_weights,
                                action_features(node.game, action),
                            )
                        ),
                        score,
                    )
                    if successor.terminal or successor.current_player != responder:
                        completed.append(child)
                    else:
                        expanded.append(child)
            if not expanded:
                break
            expanded.sort(
                key=lambda node: (
                    -node.score,
                    tuple(action.short() for action in node.sequence),
                )
            )
            beam = expanded[: self.response_beam_width]

        for node in beam:
            successor = node.game.clone()
            successor.step(Action("end"), validate=False)
            completed.append(
                _Node(
                    successor,
                    node.sequence + (Action("end"),),
                    node.prior,
                    self._value(successor, responder)
                    + self.prior_scale * node.prior,
                )
            )
        if not completed:
            return self._value(game, actor)
        best_reply = max(
            completed,
            key=lambda node: (
                node.score,
                tuple(action.short() for action in node.sequence),
            ),
        )
        return self._value(best_reply.game, actor)
