# Portfolio media sources

Prepared 4 October 2026 from Markus Lejon's public project media. These are real project images and footage, not generated illustrations. Originals remain outside this repository; only web-sized derivatives are included.

## Spot lab photograph

Source: [RLonSpot / spot_standing_unstowed.jpg](https://github.com/DevMarkusLejon/RLonSpot/blob/main/media/images/spot_standing_unstowed.jpg).

- `images/spot-lab.webp`: 1600 × 1205, 348,084 bytes; full photograph resized, WebP quality 82.
- `images/spot-lab-small.webp`: 800 × 602, 102,098 bytes; full photograph resized, WebP quality 80.
- `images/social-card.jpg`: 1200 × 630, 156,230 bytes; cropped photograph beside a code-composited title panel.

Suggested alt text: “Boston Dynamics Spot with its arm extended in a robotics laboratory.” The picture alone does not demonstrate autonomous manipulation or door opening.

## Spot deployment clip

Source: [RLonSpot / finetune_diverse_locomotion.mp4](https://github.com/DevMarkusLejon/RLonSpot/blob/main/media/videos/finetune_diverse_locomotion.mp4).

- `videos/spot-deployment.mp4`: original seconds 4–24, 20 seconds, 854 × 480, 24 fps, 543,056 bytes. H.264 CRF 29, silent, fast-start MP4.
- `images/spot-deployment.webp`: source frame at 8 seconds, 854 × 480, 36,050 bytes; WebP quality 84.

Suggested caption: “Supervised locomotion deployment test with an overhead safety tether.” Representative source frames and the poster were visually checked. The clip shows Spot moving in a lab with an overhead tether and two supervisors. Do not describe it as untethered autonomy, a door-opening demonstration, or a quantified performance result.

## Existing Grids image

`posters/grids-ai-demo.png` predates this media pass and is retained unchanged. Use it as a game-interface image, not as evidence of a particular trained policy's performance.

## Standing-policy hardware plot

`images/spot-hardware-log.png`: 1600 × 1067, 111,124 bytes, rendered from
[FL_joint_pos_deployment_plot.pdf](https://github.com/DevMarkusLejon/RLonSpot/blob/main/data/plotting_images/standing_deployment_log93/FL_joint_pos_deployment_plot.pdf).
It matches thesis Fig. 4.4, p. 38: disturbed standing deployment, not locomotion.
Measured versus policy-target joint angles reveal a remaining tracking mismatch.
It is not a hardware reliability percentage.

## RobotLab collaboration clip and public CV

Supplied and approved by Markus on 4 October 2026; original files stay outside this repository.

- `videos/robotlab-network-demo.mp4`: source seconds 8–54, 46 seconds, 1280 × 706, 24 fps, 1,573,708 bytes; H.264 CRF 26, silent, fast-start MP4.
- The connection-control column is removed by cropping and recomposing the two views. The visible bystander region in the physical camera view is covered with an opaque mask.
- `images/robotlab-network-demo.webp`: poster from derivative second 22.
- The game interface, physical robot camera views, and digital twin are distinct views of a team demo. Markus confirms physical UR5e operation over Ericsson's network. Do not interpret on-screen telemetry as a validated latency/reliability benchmark or claim the team UI/digital twin as solely his work.
- `documents/markus-lejon-cv-2026.pdf`: supplied current CV with the street address and phone removed by applied PDF redactions, cleaned metadata, and email/LinkedIn contact links. The original CV is unchanged. Its abbreviated playlist link is replaced with the supplied [YouTube watch link](https://www.youtube.com/watch?v=WnL8DfprDFw&list=PLCaqj4_wJsvk); this external video's contents were not independently reviewed.

## Derivation notes

The Spot derivatives were created with FFmpeg from the linked originals. The social card combines the photograph with a dark title panel and text; no robot or laboratory content was invented. Source links use the upstream main branch, whose contents may change over time.

## Controller explorer

`assets/controllers/wood-*.webp` and `wood.glb`: photographic reconstruction of Markus's wooden handwired controller, 22 keys, f1copy enclosure dimensions confirmed by Markus. Source home photographs are not published. The transparent plexiglass bottom panel was confirmed by Markus. Internal dimensions and panel thicknesses are inferred.

`assets/controllers/bubble-*.webp`, `bubble.glb` and BubbleBox sections in `geometry.json`: derived from UMS-Ultra/BubbleBox V4 mono case and bottom panel, CC BY-NC 4.0. Reconstructed using sampled CAD cross-sections; electronics and controls are schematic. Full provenance, modifications and licenses are in `assets/controllers/README.md` and on the project page.

## KALLAX assembly study

`images/kallax-assembly.webp`: captured from this project's procedural Three.js model in exploded view, then encoded as WebP. It is a reconstructed illustration, not a product photograph or a physical assembly test.

`projects/kallax/manual/`: the official [IKEA AA-2703308-1 PDF](https://www.ikea.com/se/en/assembly_instructions/kallax-shelving-unit-white__AA-2703308-1-100.pdf), 2026-03-24, and rendered pages 9–28. These retain their original IKEA diagrams and attribution. The guide supports article 202.758.14's 10-dowel kit; the alternative 14-dowel manual is linked, not animated. Page mapping and modelling limits are retained in `tools/kallax-guide/MANUAL-AUDIT.md`.
