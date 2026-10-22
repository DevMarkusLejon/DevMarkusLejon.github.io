extends Node2D

const CELL = 78.0
const BOARD = Vector2(352, 151)
const INK = Color("dce7e7")
const MUTED = Color("8fa5ad")
const BLUE = Color("70bfff")
const RED = Color("f28c79")
const MINT = Color("a6e4ba")
const AI_STEP_PAUSE = 1.0
const HIT_TIME = 0.42
const COMBAT_TIME = 1.35

var state: Dictionary = {}
var selected_unit: int = -1
var selected_card: String = ""
var busy = false
var error_text = ""
var base_url = "http://127.0.0.1:8766"
var request_node: HTTPRequest
var cards: Control
var art: Dictionary = {}
var display_positions: Dictionary = {}
var font: Font = ThemeDB.fallback_font
var browser_bridge: JavaScriptObject
var browser_callback: JavaScriptObject
var combat: Dictionary = {}
var combat_age = 0.0


func _ready() -> void:
	for name in ["commander", "warrior", "archer", "freeze_mage", "viking", "assassin", "healer", "ninja", "base", "log", "tree", "rock", "grass", "strength", "action_block", "freeze", "meteorite", "brain_power", "fireball", "teleport", "charm"]:
		art[name] = load("res://assets/" + name + ".png")
	for name in ["arrow", "ice_spike", "spark", "healing_effect", "meteor", "blood"]:
		art[name] = load("res://assets/" + name + ".png")
	if OS.has_feature("web"):
		base_url = str(JavaScriptBridge.eval("window.location.origin"))
		browser_bridge = JavaScriptBridge.get_interface("GridsBridge")
		if browser_bridge != null:
			browser_callback = JavaScriptBridge.create_callback(_browser_received)
	request_node = HTTPRequest.new()
	add_child(request_node)
	request_node.request_completed.connect(_received)
	cards = Control.new()
	add_child(cards)
	_button("Dra enhet", Vector2(42, 420), Vector2(248, 46), func(): _send_kind("draw_unit"))
	_button("Dra föremål", Vector2(42, 476), Vector2(248, 46), func(): _send_kind("draw_item"))
	_button("Avsluta tur", Vector2(42, 552), Vector2(248, 52), func(): _send_kind("end"))
	_button("Ny match", Vector2(42, 748), Vector2(248, 42), func(): _fetch("/api/reset", {}))
	_fetch("/api/state")


func _process(delta: float) -> void:
	var moving = false
	if not combat.is_empty():
		combat_age += delta
		moving = true
	for unit in state.get("units", []):
		var id_value = int(unit.id)
		var target = BOARD + Vector2(unit.x, unit.y) * CELL
		if not combat.is_empty() and int(unit.id) == int(combat.unit_id) and combat.attack_type == "melee" and combat.kind in ["attack", "attack_log"]:
			target = _cell_position(combat.approach) - Vector2.ONE * CELL / 2
		if not display_positions.has(id_value):
			display_positions[id_value] = target
		var current: Vector2 = display_positions[id_value]
		if current.distance_to(target) > 0.2:
			display_positions[id_value] = current.lerp(target, minf(delta * 12, 1))
			moving = true
		else:
			display_positions[id_value] = target
	if moving:
		queue_redraw()


func _button(text: String, at: Vector2, size: Vector2, callback: Callable, parent: Node = null) -> Button:
	var button = Button.new()
	button.text = text
	button.position = at
	button.size = size
	button.add_theme_font_size_override("font_size", 17)
	var normal = StyleBoxFlat.new()
	normal.bg_color = Color("1c303d")
	normal.border_color = Color("355060")
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(8)
	button.add_theme_stylebox_override("normal", normal)
	var hover = normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color("2b4654")
	hover.border_color = MINT
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("focus", hover)
	button.pressed.connect(callback)
	if parent == null:
		add_child(button)
	else:
		parent.add_child(button)
	return button


func _fetch(path: String, body: Variant = null) -> void:
	if busy:
		return
	busy = true
	error_text = ""
	queue_redraw()
	if browser_bridge != null:
		browser_bridge.request(path, JSON.stringify(body), browser_callback)
		return
	var result: Error
	if body == null:
		result = request_node.request(base_url + path)
	else:
		result = request_node.request(base_url + path, ["Content-Type: application/json"], HTTPClient.METHOD_POST, JSON.stringify(body))
	if result != OK:
		busy = false
		error_text = "Kunde inte ansluta till den lokala Python-servern."
		queue_redraw()


func _browser_received(args: Array) -> void:
	_received(HTTPRequest.RESULT_SUCCESS, int(args[0]), PackedStringArray(), str(args[1]).to_utf8_buffer())


func _received(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var parsed = JSON.parse_string(body.get_string_from_utf8())
	if result != HTTPRequest.RESULT_SUCCESS or not parsed is Dictionary:
		error_text = "Ingen kontakt. Starta prototypens Python-server och ladda om sidan."
	elif code != 200:
		error_text = parsed.get("error", "Draget kunde inte utföras.")
		if parsed.has("state"):
			state = parsed.state
	else:
		var event: Dictionary = parsed.get("event", {})
		if not state.is_empty() and int(parsed.revision) > int(state.revision) and _has_combat(event):
			combat = event
			combat_age = 0.0
			selected_unit = -1
			selected_card = ""
			_publish_debug()
			queue_redraw()
			await get_tree().create_timer(HIT_TIME).timeout
			state = parsed
			_publish_debug()
			await get_tree().create_timer(COMBAT_TIME - HIT_TIME).timeout
			combat = {}
		state = parsed
		if int(state.turn) == 1 and int(state.actions_left) == 7:
			display_positions.clear()
	busy = false
	selected_unit = -1
	selected_card = ""
	_rebuild_hand()
	_publish_debug()
	queue_redraw()
	if code == 200 and error_text.is_empty() and int(state.get("player", 0)) == 1 and not state.get("terminal", false):
		_continue_ai(int(state.revision))


func _continue_ai(revision: int) -> void:
	await get_tree().create_timer(AI_STEP_PAUSE).timeout
	# A reset during the pause invalidates this pending AI step.
	if not busy and int(state.get("revision", -1)) == revision and int(state.get("player", 0)) == 1:
		_fetch("/api/ai-step", {"revision": revision})


func _publish_debug() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.gridsPrototypeState = " + JSON.stringify(state))
		JavaScriptBridge.eval("window.gridsCombat = " + JSON.stringify({"active": not combat.is_empty(), "event": combat}))


func _has_combat(event: Dictionary) -> bool:
	return not event.is_empty() and (event.kind in ["attack", "attack_log", "heal"] or not event.changes.is_empty() or (event.kind == "item" and event.target[0] >= 0))


func _cell_position(cell: Array) -> Vector2:
	return BOARD + (Vector2(cell[0], cell[1]) + Vector2.ONE * 0.5) * CELL


func _outlined_text(value: String, at: Vector2, size: int, color: Color) -> void:
	draw_string_outline(font, at, value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, 5, Color(0.04, 0.07, 0.09, color.a))
	_text(value, at, size, color)


func _draw_combat() -> void:
	if combat.is_empty():
		return
	var target = _cell_position(combat.target)
	var source = _cell_position(combat.source)
	var windup = clampf(combat_age / HIT_TIME, 0, 1)
	var after = combat_age - HIT_TIME
	var healing = combat.kind == "heal"
	var color = MINT if healing else RED
	if combat.attack_type == "magic" or combat.card == "freeze":
		color = Color("a1eaff")
	if combat_age < HIT_TIME and combat.kind in ["attack", "attack_log", "heal", "item"]:
		draw_arc(target, 29 + 7 * sin(windup * PI), 0, TAU, 36, Color(color, 0.8), 2, true)
		if combat.unit_kind == "archer" and combat.kind in ["attack", "attack_log"]:
			var point = source.lerp(target, windup) - Vector2(0, sin(windup * PI) * 45)
			var direction = target - source + Vector2(0, -cos(windup * PI) * 45 * PI)
			draw_set_transform(point, direction.angle() + PI / 2, Vector2.ONE)
			_picture("arrow", Rect2(-19, -19, 38, 38))
			draw_set_transform(Vector2.ZERO)
		elif combat.card == "meteorite":
			var point = target + Vector2(90, -180) * (1 - windup)
			_picture("meteor", Rect2(point - Vector2.ONE * 30, Vector2.ONE * 60))
		elif combat.attack_type in ["magic", "healer"]:
			draw_arc(source, 17 + 12 * windup, -PI, 0, 24, Color(color, windup), 3, true)
	if after < 0:
		return
	var fade = clampf(1 - after / (COMBAT_TIME - HIT_TIME), 0, 1)
	if combat.kind in ["attack", "attack_log", "heal", "item"] and after < 0.45:
		draw_arc(target, 8 + after * 70, 0, TAU, 32, Color(color, 1 - after / 0.45), 3, true)
		if combat.unit_kind == "freeze_mage" or combat.card == "freeze":
			_picture("ice_spike", Rect2(target + Vector2(-CELL / 2, -18), Vector2(CELL, CELL / 2)), Color(1, 1, 1, fade))
		if healing:
			for index in range(4):
				var point = target + Vector2(sin(index * 2.1) * 22, 12 - after * 60 - index * 7)
				_picture("healing_effect", Rect2(point, Vector2.ONE * 12), Color(1, 1, 1, fade))
	for change in combat.changes:
		var center = _cell_position(change.cell)
		var damage = int(change.get("hp_damage", int(change.hp_before) - int(change.hp_after)))
		var absorbed = int(change.armor_before) - int(change.armor_after)
		if change.dead:
			_picture(change.kind, Rect2(center - Vector2.ONE * CELL / 2, Vector2.ONE * CELL), Color(1, 1, 1, fade * 0.6))
		if damage > 0 or absorbed > 0:
			for index in range(7):
				var direction = Vector2.from_angle(index * TAU / 7 + 0.3)
				var point = center + direction * (8 + after * 65) + Vector2(0, after * after * 35)
				_picture("spark" if absorbed > 0 or change.kind == "log" else "blood", Rect2(point - Vector2.ONE * 4, Vector2.ONE * 8), Color(1, 1, 1, fade))
		var rise = Vector2(-21, -30 - after * 38)
		var popup_color = MINT if damage < 0 else Color("ff685e")
		popup_color.a = minf(fade * 3, 1)
		if damage != 0:
			var text = ("−" if damage > 0 else "+") + str(absi(damage))
			_outlined_text(text, center + rise, 29 + int(4 * sin(minf(after * 8, PI))), popup_color)
		if absorbed > 0:
			_outlined_text("−" + str(absorbed) + " sköld", center + rise + Vector2(-7, -27), 18, Color(BLUE, popup_color.a))


func _rebuild_hand() -> void:
	for child in cards.get_children():
		cards.remove_child(child)
		child.queue_free()
	var hand: Array = state.get("hand", [])
	for index in range(hand.size()):
		var card: String = hand[index]
		var label: String = state.labels.get(card, card)
		var button = _button(label + "\n" + str(int(state.costs.get(card, 0))) + " actions", Vector2(352 + index * 110, 762), Vector2(102, 110), func(): _select_card(card), cards)
		button.icon = art.get(card)
		button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
		button.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
		button.expand_icon = true
		button.icon_max_width = 36
		button.add_theme_font_size_override("font_size", 13)
		button.tooltip_text = label


func _select_card(card: String) -> void:
	if busy or state.get("terminal", false) or int(state.get("player", 0)) == 1:
		return
	selected_card = card
	selected_unit = -1
	for action in state.get("legal", []):
		if action.card == card and action.kind == "item" and int(action.target_id) < 0 and int(action.x) < 0:
			_send_action(action)
			return
	queue_redraw()


func _send_kind(kind: String) -> void:
	if busy or int(state.get("player", 0)) == 1:
		return
	for action in state.get("legal", []):
		if action.kind == kind:
			_send_action(action)
			return
	error_text = "Den handlingen är inte tillgänglig just nu."
	queue_redraw()


func _send_action(action: Dictionary) -> void:
	_fetch("/api/action", {"revision": int(state.revision), "action_id": int(action.id)})


func _unit_by_id(id_value: int) -> Dictionary:
	for unit in state.get("units", []):
		if int(unit.id) == id_value:
			return unit
	return {}


func _action_cell(action: Dictionary) -> Vector2i:
	if action.kind == "attack_log":
		var parts: PackedStringArray = action.card.split(",")
		return Vector2i(int(parts[0]), int(parts[1]))
	if int(action.target_id) >= 0:
		var target = _unit_by_id(int(action.target_id))
		if not target.is_empty():
			return Vector2i(int(target.x), int(target.y))
	return Vector2i(int(action.x), int(action.y))


func _selected_actions() -> Array:
	var actions: Array = []
	for action in state.get("legal", []):
		if not selected_card.is_empty():
			if action.card == selected_card and action.kind in ["deploy", "item"]:
				actions.append(action)
		elif selected_unit >= 0 and int(action.unit_id) == selected_unit:
			actions.append(action)
	return actions


func _unhandled_input(event: InputEvent) -> void:
	if not event is InputEventMouseButton or not event.pressed or event.button_index != MOUSE_BUTTON_LEFT or busy or int(state.get("player", 0)) == 1:
		return
	var cell = Vector2i((get_global_mouse_position() - BOARD) / CELL)
	if not Rect2(BOARD, Vector2(10 * CELL, 7 * CELL)).has_point(get_global_mouse_position()):
		return
	for action in _selected_actions():
		if _action_cell(action) == cell:
			_send_action(action)
			return
	selected_card = ""
	selected_unit = -1
	for unit in state.get("units", []):
		if int(unit.x) == cell.x and int(unit.y) == cell.y and int(unit.owner) == 0:
			selected_unit = int(unit.id)
	queue_redraw()


func _text(value: String, at: Vector2, size: int = 18, color: Color = INK) -> void:
	draw_string(font, at, value, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)


func _picture(name: String, rect: Rect2, color: Color = Color.WHITE) -> void:
	if art.has(name) and art[name] != null:
		draw_texture_rect(art[name], rect, false, color)


func _draw() -> void:
	draw_rect(Rect2(20, 20, 292, 860), Color("13232e"))
	_text("GRIDS", Vector2(42, 82), 42)
	_text("ORIGINAL ART · NEW ENGINE", Vector2(44, 110), 12, MINT)
	_text("Plains", Vector2(42, 179), 28)
	_text("Du spelar blått mot AI:n.", Vector2(42, 212), 17, MUTED)
	_text("1   Välj en enhet eller ett kort", Vector2(42, 280), 15)
	_text("2   Klicka på en markerad ruta", Vector2(42, 312), 15)
	_text("3   Avsluta turen när du är klar", Vector2(42, 344), 15)
	_text("Korten visar sin actionkostnad.", Vector2(42, 380), 14, MUTED)
	_text("DIN EGEN MATCH" if browser_bridge != null else "LOKAL PROTOTYP", Vector2(42, 698), 12, MINT)
	_text("En egen match i varje flik" if browser_bridge != null else "Godot + Python · standardlek", Vector2(42, 722), 14, MUTED)
	_text("Grafik från originalets Grids 1.5.7", Vector2(42, 833), 12, MUTED)
	_text("PLAY   /   PLAINS 10 × 7", Vector2(352, 60), 13, MINT)
	var actions_left = int(state.get("actions_left", 7))
	var turn_title = "AI:ns tur" if int(state.get("player", 0)) == 1 else "Din tur"
	_text("Matchen är slut" if state.get("terminal", false) else turn_title, Vector2(352, 104), 30)
	_text("TUR " + str(int(state.get("turn", 1))), Vector2(1040, 99), 16, MUTED)
	for index in range(7):
		draw_circle(Vector2(575 + index * 25, 94), 7, MINT if index < actions_left else Color("28424e"))
	for y in range(7):
		for x in range(10):
			var rect = Rect2(BOARD + Vector2(x, y) * CELL, Vector2.ONE * CELL)
			var color = Color("78935f") if (x + y) % 2 == 0 else Color("718b59")
			if x == 0:
				color = color.lerp(Color("5c9da2"), 0.25)
			elif x == 9:
				color = color.lerp(Color("bb795b"), 0.25)
			draw_rect(rect, color)
			draw_rect(rect, Color(0, 0, 0, 0.08), false, 1)
			if (x * 7 + y * 3) % 9 == 0:
				_picture("grass", Rect2(rect.position + Vector2(7, 40), Vector2(30, 30)))
	for block in state.get("blocks", []):
		var pos = Vector2(block[0], block[1])
		var rect = Rect2(BOARD + pos * CELL, Vector2.ONE * CELL)
		if int(block[0]) in [0, 9] and int(block[1]) in [0, 6]:
			draw_rect(rect, Color("1b3036"))
		elif int(block[0]) == 3:
			_picture("tree", Rect2(rect.position - Vector2(0, CELL * 0.75), Vector2(CELL, CELL * 2)))
		else:
			_picture("rock", rect.grow(8))
	for log in state.get("logs", []):
		_picture("log", Rect2(BOARD + Vector2(log[0], log[1]) * CELL, Vector2.ONE * CELL))
	for fire in state.get("fires", []):
		draw_circle(BOARD + (Vector2(fire[0], fire[1]) + Vector2.ONE * 0.5) * CELL, 26, Color(1, 0.4, 0.1, 0.7))
	for action in _selected_actions():
		var cell = _action_cell(action)
		if cell.x >= 0 and cell.y >= 0:
			var rect = Rect2(BOARD + Vector2(cell) * CELL + Vector2.ONE * 3, Vector2.ONE * (CELL - 6))
			var color = RED if action.kind in ["attack", "attack_log"] else MINT
			draw_rect(rect, Color(color, 0.2))
			draw_rect(rect, color, false, 2)
	for cell in state.get("ai_cells", []):
		var rect = Rect2(BOARD + Vector2(cell[0], cell[1]) * CELL + Vector2.ONE * 3, Vector2.ONE * (CELL - 6))
		draw_rect(rect, Color(RED, 0.2))
		draw_rect(rect, RED, false, 3)
	for unit in state.get("units", []):
		var target_pos = BOARD + Vector2(unit.x, unit.y) * CELL
		var pos: Vector2 = display_positions.get(int(unit.id), target_pos)
		var tint = BLUE if int(unit.owner) == 0 else RED
		draw_ellipse_shadow(pos + Vector2(CELL / 2, CELL - 15))
		_picture("base", Rect2(pos, Vector2.ONE * CELL), tint)
		var sprite_pos = pos + Vector2.ONE * CELL / 2
		var angle = 0.0
		var shown_hp = float(unit.hp)
		var sprite_tint = Color.WHITE
		if not combat.is_empty():
			if int(unit.id) == int(combat.unit_id) and combat.kind in ["attack", "attack_log", "heal"]:
				var pulse = sin(clampf(combat_age / (HIT_TIME * 2), 0, 1) * PI)
				var direction = (_cell_position(combat.target) - sprite_pos).normalized()
				if combat.attack_type == "melee":
					sprite_pos += direction * pulse * 24
					angle = pulse * (0.9 if combat.unit_kind in ["warrior", "viking", "assassin"] else 0.25) * (1 if direction.x >= 0 else -1)
				elif combat.attack_type in ["magic", "healer"]:
					sprite_pos.y -= pulse * 15
					angle = pulse * 0.3
			for change in combat.changes:
				if int(change.id) == int(unit.id) and combat_age >= HIT_TIME:
					var after = combat_age - HIT_TIME
					shown_hp = lerpf(float(change.hp_before), float(change.hp_after), clampf(after / 0.45, 0, 1))
					if change.hp_before > change.hp_after and after < 0.22:
						sprite_tint = Color(1, 0.45 + after * 2, 0.45 + after * 2)
						sprite_pos.x += sin(after * 70) * 4 * (1 - after / 0.22)
		draw_set_transform(sprite_pos, angle, Vector2.ONE)
		_picture(unit.kind, Rect2(-Vector2.ONE * CELL / 2, Vector2.ONE * CELL), sprite_tint)
		draw_set_transform(Vector2.ZERO)
		var bar_pos = pos + Vector2(10, CELL - 9)
		draw_rect(Rect2(bar_pos, Vector2(CELL - 20, 6)), Color("243127"))
		var hp_fraction = clampf(shown_hp / float(unit.max_hp), 0, 1)
		draw_rect(Rect2(bar_pos, Vector2((CELL - 20) * hp_fraction, 6)), tint)
		if shown_hp > float(unit.max_hp):
			draw_rect(Rect2(bar_pos, Vector2((CELL - 20) * (shown_hp / float(unit.max_hp) - 1), 6)), MINT)
		_outlined_text(str(maxi(0, roundi(shown_hp))), pos + Vector2(2, 13), 16, INK)
		if int(unit.id) == selected_unit:
			draw_rect(Rect2(pos + Vector2.ONE * 2, Vector2.ONE * (CELL - 4)), BLUE, false, 3)
		if int(unit.frozen) > 0:
			draw_rect(Rect2(pos + Vector2.ONE * 6, Vector2.ONE * (CELL - 12)), Color(0.5, 0.8, 1, 0.35))
		if int(unit.burning) > 0:
			draw_circle(pos + Vector2(CELL - 12, 12), 6, Color("ffb568"))
	_draw_combat()
	for x in range(10):
		_text(str(x + 1), BOARD + Vector2(x * CELL + CELL / 2 - 4, -13), 12, MUTED)
	for y in range(7):
		_text(str(y + 1), BOARD + Vector2(-20, y * CELL + CELL / 2 + 5), 12, MUTED)
	var message: String = state.get("message", "Ansluter till Python-motorn…")
	if not combat.is_empty():
		message = combat.description
	elif busy and int(state.get("player", 0)) != 1:
		message = "Bearbetar draget… AI:n tänker vid turbyte."
	elif not error_text.is_empty():
		message = error_text
	elif not selected_card.is_empty():
		message = state.labels.get(selected_card, selected_card) + " · välj en markerad målruta"
	elif selected_unit >= 0:
		message = "Blå markering: vald enhet · grönt: flytta / hela · rött: attackera"
	_text(message.left(100), Vector2(352, 731), 15, MINT if error_text.is_empty() else RED)
	_text("DIN HAND", Vector2(352, 751), 11, MUTED)


func draw_ellipse_shadow(center: Vector2) -> void:
	draw_set_transform(center, 0, Vector2(1, 0.3))
	draw_circle(Vector2.ZERO, 25, Color(0, 0, 0, 0.18))
	draw_set_transform(Vector2.ZERO)
