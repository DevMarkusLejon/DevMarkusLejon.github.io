# BILLY manual audit

Checked 2026-10-21 against the assembly PDF linked by the official [IKEA product page](https://www.ikea.com/se/en/p/billy-bookcase-white-00263850/): white BILLY, **80 × 28 × 202 cm**, article **002.638.50**.

Source: [AA-1823127-9](https://www.ikea.com/se/en/assembly_instructions/billy-bookcase-white__AA-1823127-9-100.pdf), printed **2024-03-25**, 16 pages. The PDF is retained unchanged in `public/manual/`; pages 5–13 are rendered for the source dialog. Every illustrated step on pages 6–13 was inspected, as were the preparation and anti-tip warnings. No physical assembly test was performed.

## Step mapping

| Guide scene | IKEA step | PDF page | Checked action |
| --- | --- | --- | --- |
| Preparation | Before assembly | 5 (warnings 2–4, inventory 6) | Two people, protective surface, screwdrivers, hammer, pencil, ruler. |
| dowels | 1 | 6 | 16 dowels: four each in top, bottom, fixed middle shelf and plinth. |
| bolts | 2 | 7 | 12 cam bolts in both tall sides, six each. Inner faces up. |
| firstPanels | 3 | 7 | First side flat. Fit plinth, bottom and fixed middle shelf; dowels remain in panel ends. |
| firstCams | 4 | 8 | Four cams, bottom and middle at first side. Plinth has no cams. |
| top | 5 | 8 | Fit top and two cams at first side. Top cam holes face outward towards the eventual ceiling. |
| secondSide | 6 | 9 | Lower second side over prepared connections. |
| remainingCams | 7 | 9 | Remaining six cams: top, middle and bottom at second side. |
| shelfMarks | 8 | 10 | Rear grooves up. Pencil-mark fixed middle shelf at both rear side edges. |
| back | 9 | 10 | Unfold three-section back. Slide from base towards top inside grooves. |
| nailGuide | 10 | 11 | Ruler joins side marks across the back at the fixed shelf. |
| nails | 11 | 11 | 18 nails, three rows of six: top, marked middle, bottom. Avoid round cam holes. |
| raise | 12a (part of 12) | 12 | Raise with helper; allow access above top. |
| anchor | 12b (rest of 12) | 12 | Two top L brackets, two supplied furniture screws, four washers and two suitable wall screws. |
| supports | 13 | 13 | 16 supports: four per adjustable shelf, level front/rear and across both sides. |
| shelves | 14 | 13 | Four adjustable shelves lowered onto supports; seating detail shown. |
| Complete | Final review | 13 + product page | Cam locks, back, wall brackets and shelf seating; maximum 30 kg/shelf from product page. |

Step 12 is deliberately split into two screens to show raising and anchoring clearly. Both source links open page 12 and identify the original step as 12. No IKEA operation is skipped or reordered. Adjustable shelves appear after anchoring.

## Fittings reconciliation

| Part | Code | Inventory | Assembly usage |
| --- | --- | --- | --- |
| Wooden dowel | 101351 | 16 | Step 1: 4 × 4 panels |
| Cam bolt | 118331 | 12 | Step 2: 6 × 2 sides |
| Cam lock | 119081 | 12 | Steps 4, 5, 7: 4 + 2 + 6 |
| Back nail | 101201 | 18 | Step 11: 3 rows × 6 |
| Shelf support | 131372 | 16 | Step 13: 4 shelves × 4 |
| Wall bracket | 106989 | 2 | Step 12 |
| Furniture screw | 109041 | 2 | Step 12: one per bracket |
| Washer | 100823 | 4 | Step 12: one per furniture screw and one per wall screw |

Wall screws (two) and any wall plugs are selected for the wall and are not supplied. Boards: two tall sides; top, bottom and fixed middle shelf; narrow front plinth; four adjustable shelves (ten boards), plus one folding fibreboard back.

## Visual checks and modelling limits

The model follows the floor orientation in the drawings: first side flat for steps 3–7, rear grooves facing up for 8–11, upright for raising/anchoring and shelf installation. It shows outward-facing top cams, separate side marks and a connecting back-panel line, three nail rows, back folding/sliding, two wall brackets and four supports at every adjustable shelf.

Overall size is source-backed. Thicknesses, hole pitches, rear-groove geometry, cut-outs, shelf heights, material colours, nail spacing and fitting shapes are reconstructed and simplified. Shelf heights are one example; use matching factory holes. The wall plane and fixings are schematic. Do not infer drill positions, wall screw size, plug type, tool torque or a safe lifting technique from the model. The guide links the full IKEA warning text and original drawing on every screen. It is independent of IKEA.

## Verification

Production build and portfolio link/fragment checks passed. Browser checks covered all 17 screens and source-page mapping, timeline keyboard focus, progress restored after reload, replay and scrubbing, and phone/tablet/desktop layouts (320, 390, 768 and 1265 px). The step 12 source dialog identifies the original step as 12 for both split screens. Source drawings load from the nested project path.
