import copy
import json

import pytest

from grids_ai.browser_match import PrototypeMatch


def round_trip(match):
    restored = PrototypeMatch(seed=99)
    restored.restore(json.loads(json.dumps(match.save())))
    return restored


def test_save_restores_full_private_state_without_revealing_it_in_public_state():
    match = PrototypeMatch()
    move = next(a for a in match.state()["legal"] if a["kind"] == "move")
    match.act({"revision": 0, "action_id": move["id"]})
    unit = match.game.units[1]
    unit.hp, unit.armor, unit.frozen, unit.burning = 215, 10, 2, 1
    unit.attacked = {0, 42}
    match.game.fires[(2, 2)] = 3
    match.game.players[1].blocked_turns = 3
    restored = round_trip(match)
    assert restored.game == match.game
    assert restored.revision == match.revision
    assert restored.seed == match.seed
    assert restored.history == match.history
    assert restored.event == {}
    state = restored.state()
    assert "players" not in state
    assert "unit_deck" not in state
    assert len(state["hand"]) == len(restored.game.players[0].hand)


def test_drawing_after_restore_keeps_the_saved_deck_order():
    match = PrototypeMatch()
    restored = round_trip(match)
    for game in (match, restored):
        draw = next(a for a in game.state()["legal"] if a["kind"] == "draw_unit")
        game.act({"revision": game.revision, "action_id": draw["id"]})
    assert restored.game == match.game


@pytest.mark.parametrize("paused", [False, True])
def test_autoplay_and_pause_resume_from_the_saved_turn(paused):
    match = PrototypeMatch()
    match.set_autoplay({"revision": 0, "enabled": True})
    match.agent.choose_action = lambda game: game.legal_actions()[0]
    match.ai_step({"revision": 1})
    match.set_paused({"revision": 2, "paused": paused})
    restored = round_trip(match)
    assert restored.game == match.game
    assert restored.autoplay and restored.paused == paused
    restored.agent.choose_action = lambda game: game.legal_actions()[0]
    if paused:
        with pytest.raises(ValueError, match="pausade"):
            restored.ai_step({"revision": 3})
    restored.ai_step({"revision": 3, "single_step": paused})
    assert restored.revision == 4
    assert restored.game.current_player == 0
    assert restored.paused == paused
    assert len(restored.history) == 2


def test_single_step_stays_paused_across_a_turn_boundary():
    match = PrototypeMatch()
    match.set_autoplay({"revision": 0, "enabled": True})
    match.set_paused({"revision": 1, "paused": True})
    match.agent.choose_action = lambda game: game.legal_actions()[0]
    for revision in (2, 3):
        match.ai_step({"revision": revision, "single_step": True})
        assert match.paused
    assert match.game.current_player == 0
    assert match.game.half_turn == 3
    with pytest.raises(ValueError, match="ändrats"):
        match.set_paused({"revision": 2, "paused": False})


def test_terminal_match_restores_without_replaying_the_lethal_hit():
    match = PrototypeMatch()
    match.game.units[1].x = 2
    match.game.units[1].hp = 5
    action = next(a for a in match.state()["legal"] if a["kind"] == "attack")
    match.act({"revision": 0, "action_id": action["id"]})
    restored = round_trip(match)
    assert restored.game.terminal
    assert restored.game.winner == 0
    assert restored.event == {}
    assert len(restored.history) == 1
    assert "besegrad" in restored.history[0]["details"][0]


@pytest.mark.parametrize("fault", ["ruleset", "format", "unit", "duplicate", "card", "turn", "seed", "history", "blocked", "fractional", "winner"])
def test_invalid_save_is_rejected_without_partially_replacing_the_match(fault):
    match = PrototypeMatch()
    saved = json.loads(json.dumps(match.save()))
    if fault in ("ruleset", "format"):
        saved[fault] = "unsupported"
    elif fault == "unit":
        saved["game"]["units"][0]["hp"] = 0
    elif fault == "duplicate":
        saved["game"]["units"].append(saved["game"]["units"][0])
    elif fault == "card":
        saved["game"]["players"][0]["hand"].append("unknown_card")
    elif fault == "turn":
        saved["game"]["actions_left"] = 100
    elif fault == "seed":
        saved["seed"] = "bad"
    elif fault == "blocked":
        saved["game"]["players"][0]["blocked_turns"] = "bad"
    elif fault == "fractional":
        saved["game"]["actions_left"] = 1.5
    elif fault == "winner":
        saved["game"]["winner"] = "bad"
    else:
        saved["history"] = [{"description": "x", "details": "bad", "player": 0, "turn": 1}]
    before = copy.deepcopy(match.save())
    with pytest.raises(ValueError):
        match.restore(saved)
    assert match.save() == before


def test_reset_replaces_the_saved_match_and_clears_history_and_watch_mode():
    match = PrototypeMatch()
    match.set_autoplay({"revision": 0, "enabled": True})
    match.set_paused({"revision": 1, "paused": True})
    match.agent.choose_action = lambda game: game.legal_actions()[0]
    match.ai_step({"revision": 2, "single_step": True})
    match.reset()
    restored = round_trip(match)
    assert restored.game.half_turn == 1
    assert not restored.autoplay and not restored.paused
    assert restored.history == []


def test_inspector_exposes_stats_descriptions_and_blocked_archer_sight():
    match = PrototypeMatch()
    archer = match.game._spawn("archer", 1, 4, 3)
    match.game._spawn("warrior", 1, 5, 3)
    state = match.state()
    info = next(unit for unit in state["units"] if unit["id"] == archer.id)
    assert [6, 3] not in info["range_cells"]
    assert [4, 2] in info["move_cells"]
    assert state["unit_specs"]["archer"]["attack_range"] == 4
    assert "fri sikt" in state["card_info"]["archer"]


def test_history_uses_impact_values_for_armor_and_damage():
    match = PrototypeMatch()
    match.game.units[1].x = 2
    match.game.units[1].armor = 15
    action = next(a for a in match.state()["legal"] if a["kind"] == "attack")
    match.act({"revision": 0, "action_id": action["id"]})
    entry = match.history[0]
    assert entry["player"] == 0 and entry["turn"] == 1
    assert "−5 liv (300 → 295)" in entry["details"][0]
    assert "−15 rustning" in entry["details"][0]
    assert round_trip(match).history == match.history
