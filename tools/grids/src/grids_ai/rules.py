"""Rules transcribed from the Grids 1.5.7 GameMaker source.

The original project is used only as a reference.  This module contains a clean,
small representation suitable for simulation and learning.
"""

from __future__ import annotations

from dataclasses import dataclass

WIDTH = 10
RULESET_VERSION = "grids-1.5.7-port-v1"
HEIGHT = 7
MAX_ACTIONS = 7
BLOCKED_ACTIONS = 4
MAX_HAND = 7
OPENING_HAND = 5
TRAINING_MAX_HALF_TURNS = 80


@dataclass(frozen=True, slots=True)
class UnitSpec:
    hp: int
    damage: int
    walk: int
    attack_range: int
    attack_type: str
    deploy_cost: int
    moveable: bool = True
    knockback: int = 1
    buffable: bool = True


# scr_unitVars calls in the corresponding object Create events, plus costs from
# scr_getActioncost.gml. Only cards in scr_defaultDeck.gml are required here.
UNIT_SPECS: dict[str, UnitSpec] = {
    "commander": UnitSpec(300, 20, 2, 1, "melee", 0),
    "warrior": UnitSpec(100, 40, 2, 1, "melee", 2),
    "archer": UnitSpec(80, 20, 2, 4, "ranged", 2),
    "freeze_mage": UnitSpec(100, 10, 2, 2, "magic", 2, knockback=0),
    "viking": UnitSpec(90, 60, 1, 1, "melee", 2),
    "assassin": UnitSpec(60, 20, 3, 1, "melee", 1),
    "healer": UnitSpec(80, 30, 3, 3, "healer", 2),
    "ninja": UnitSpec(100, 40, 2, 1, "melee", 3),
}

ITEM_COSTS: dict[str, int] = {
    "strength": 2,
    "action_block": 3,
    "freeze": 1,
    "meteorite": 2,
    "brain_power": 6,
    "fireball": 1,
    "teleport": 4,
    "charm": 2,
}


def default_unit_deck() -> list[str]:
    """Return the 15-card unit deck from scr_defaultDeck.gml."""
    return (
        ["warrior"] * 3
        + ["archer"] * 3
        + ["freeze_mage"] * 2
        + ["viking"] * 2
        + ["assassin"] * 2
        + ["healer"] * 2
        + ["ninja"]
    )


def default_item_deck() -> list[str]:
    """Return the 15-card item deck from scr_defaultDeck.gml."""
    doubled = [
        "strength",
        "action_block",
        "freeze",
        "meteorite",
        "brain_power",
        "fireball",
        "teleport",
    ]
    return doubled * 2 + ["charm"]


# Plains layout from scr_getDefaultMap.gml.  Blocks are indestructible; logs
# are destructible 30-HP obstacles from obj_log.object.gmx.
PLAIN_BLOCKS = frozenset({(0, 0), (0, 6), (9, 0), (9, 6), (6, 1), (3, 5)})
PLAIN_LOGS = {(5, 2): 30, (4, 4): 30}
COMMANDER_STARTS = ((1, 3), (8, 3))

CARD_LABELS = {
    "freeze_mage": "Freeze Mage",
    "brain_power": "Brain Power",
    "action_block": "Action Block",
    "fireball": "Fireball",
    "meteorite": "Meteorite",
    "teleport": "Teleport",
    "strength": "Strength +10",
    "freeze": "Freeze",
    "charm": "Charm",
}

