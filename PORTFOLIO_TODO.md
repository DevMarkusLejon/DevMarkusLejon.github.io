# Portfolio implementation checklist

Updated **2026-10-04**. The robotics-field-notebook redesign is committed, pushed, and live at [devmarkuslejon.github.io](https://devmarkuslejon.github.io/).

Release `aa28a7d` passed GitHub Pages deployment and Portfolio Checks. Live verification:
17 URLs returned 200 with matching release contents; both pages passed 320/375/390/768/1440 px
layout checks, both videos played, and keyboard/reduced-motion/no-JavaScript checks passed.

## Immediate recruiter-facing fixes

- [x] Reconcile the July 2026 thesis additions: both PDFs are present and linked from the new Spot case study.
- [x] Replace placeholder videos, decorative pathfinding, and the visitor-facing localhost link with real project evidence and usable source links.
- [x] Put selected work directly after the hero; simplify navigation to Work / About / Contact.
- [x] Use consistent Malmö/Skåne spelling and accurate thesis status. Thesis completion is not a claim of a degree award.
- [x] Add the approved public-safe CV with email/LinkedIn only. Graduate status follows the supplied current CV; immediate availability and robotics/embedded-AI priorities are confirmed by Markus.

## Evidence and content upgrades

- [x] Publish the Spot case study with co-author credit, source code, reports, supervised hardware footage, simulation task counts/results, a hardware-log plot, and limitations. Door opening is future work, not an achieved result.
- [x] Add RobotLab collaboration footage and current CV-based ownership: MQTT protocol/validation/fault handling, calibrated motion, and game-piece tracking. Physical UR5e operation over Ericsson's network is confirmed by Markus; no network performance benchmark is claimed.
- [x] Replace the toy 8×8 pathfinder with the actual 10×7 Grids screenshot and public experiment/run instructions; include modelling and earlier chess coursework as secondary work.
- [x] Add a permitted, compressed RobotLab clip with connection settings cropped out, bystander masked, and audio removed. Keep the independent simulation/offline prototype clearly separate.
- [ ] Add measured RobotLab integration results and a reproducible Grids evaluation with model version, opponent, seeds, and game count.
- [ ] Verify original C++/embedded evidence, older Spot behavior-tree source, and specific Tetra Pak achievements before expanding their claims.

## Technical and visual polish

- [x] Real responsive Spot photography, a 20-second 543 KB video, poster, clear captions, restrained warm-paper/ink/teal styling, and a matching 1200×630 social card.
- [x] Canonical/Open Graph/Twitter metadata, Person/CreativeWork structured data, SVG favicon, robots.txt, sitemap.xml, local-link checker, and a non-deploying GitHub Actions check.
- [x] Essential content/navigation works without JavaScript or remote fonts. No autoplay; reduced-motion styles; video pauses when the page is hidden.
- [x] Browser validation: root and case page have no horizontal overflow at 320/375/390/768/1440 px. Local assets/fragments pass. Hardware video plays; no browser JS errors observed.
- [x] Reconcile the existing remote thesis commits, commit/push the portfolio, and verify the actual published pages, PDFs, media, and metadata. ReLion's separate untracked work stays local; its footer link is removed until that microsite has its own authorized release.

## Optional later improvements

- [ ] Host the actual static Grids game only after checking its public deployment; do not restore an unavailable demo CTA.
- [ ] Expand RobotLab and Grids into standalone case studies as stronger public evidence becomes available.
- [ ] Expand ReLion only as clearly separate concept/venture work; its existing local microsite is preserved.
- [ ] Add calibrated embedded hardware results to Beer Pong Robot; keep simulation and future hardware work separate.
- [ ] Consider secondary AI evaluation work or privacy-respecting analytics only when useful for hiring decisions.

## Evidence and limits

Public sources: [Spot code/data](https://github.com/DevMarkusLejon/RLonSpot),
[RobotLab offline prototype](https://github.com/DevMarkusLejon/robotlab-demo),
[Grids](https://github.com/DevMarkusLejon/Grids_ai_python),
[Beer Pong Robot](https://github.com/DevMarkusLejon/beerpong-robot),
[chess coursework](https://github.com/DevMarkusLejon/FRTN85_group8MarkusCook).

Spot thesis: 2026 copyright/title page; July 2026 popular-science summary.
Simulation results: Tables 4.1–4.2, p. 41; standing hardware plot: Fig. 4.4, p. 38.
Media provenance is in `assets/MEDIA_SOURCES.md`.

Focused Outlook/Slack checks established thesis approval and recent RobotLab collaboration.
Private transcripts, teammate details, internal addresses, and team code/assets are not published.
The user supplied a current English CV and collaboration video, approved public-safe
copies, confirmed physical operation over Ericsson's network, and confirmed immediate
availability with robotics and embedded AI as the primary role targets. The CV updates
Tetra Pak to 2023–2026. Its shortened demo hyperlink is replaced with the user's supplied
YouTube watch link; automated viewing of that external video was throttled.

Numerical hardware/network reliability and latency remain unverified. The website uses
graduate status from the current CV without inventing an exact degree-award date.
