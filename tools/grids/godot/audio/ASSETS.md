# Original sound effects

These ten WAV files are byte-for-byte copies from the supplied
`Grids 1.5.7.gmx/sound/audio` folder. No synthesized replacements or music.

| Local name | Original file |
| --- | --- |
| attack_freeze | snd_attackFreezeMage.wav |
| arrow_hit | snd_arrowHit.wav |
| hit_metal | snd_hitMetal.wav |
| hit_wood | snd_hitWood.wav |
| hit_stone | snd_hitStone.wav |
| meteor_hit | snd_boulderInpact.wav |
| freeze | snd_freeze.wav |
| fire | snd_fire.wav |
| heal | snd_waterDrop.wav |
| wood_break | snd_destroyedWood.wav |

Melee impacts use the target material from original `scr_unitVars` calls:
Commander is stone; Archer, Freeze Mage and Healer are wood; Warrior, Viking,
Assassin and Ninja are metal. Logs use wood and a destruction sound on death.
Arrows use their original impact sound. Caster and meteor windup sounds start
before impact; the meteor fire sound stops at impact. Other hit sounds align
with damage revelation. Healing uses the original water-drop effect.

Playback uses eight Godot voices at a reduced volume, with quieter fire.
The sound toggle stops active voices and suppresses subsequent effects.
Browser audio starts after the visitor interacts with the game.
