# Artwork provenance

The 27 PNG files in `assets/` are byte-for-byte copies of the first frames
of the supplied original `Grids 1.5.7.gmx/sprites` resources. No generated
replacement artwork is used. `freeze_mage` maps to `spr_freezeMage`,
`rock` to `spr_simpleRock`, `strength` to `spr_strengthUp`, and
`action_block` to `spr_actionBlock`; other names follow the same original
unit/item resources. `meteorite` and `teleport` use their original Icon
resources. Sprite placement and team-base tint are implemented in Godot.

Combat adds original `spr_arrow`, `spr_blood`, `spr_spark`,
`spr_healingEffect`, `spr_iceSpike` and `spr_meteorite` as `arrow`, `blood`,
`spark`, `healing_effect`, `ice_spike` and `meteor`. The combat timing and
sprite transforms follow the original attack scripts: melee lunge/rotation,
arched arrow flight, caster lift, impact particles and rising score popups.
These are Godot approximations of the original animations, not frame-exact
replays of GameMaker's delta-dependent code.

The board colors, selection outlines, labels, health bars and interface panels
are drawn in Godot. Original sound and additional sprite animation frames
have not been included.
