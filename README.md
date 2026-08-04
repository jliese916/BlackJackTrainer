# Casa del Jefe — Video Poker Hall v30

This package is self-contained and includes `JacksOrBetterStrategy.json`.

## Main modes

- **Play** — first tab; wager five units, choose holds, draw replacements, compare your bankroll with optimal play, and review every incorrect decision from the current session.
- **Train** — practice optimal holds with immediate feedback and a persistent score.
- **Look Up** — enter any five-card hand, view all tied optimal holds, and open the embedded **Complete Decision Ladder**.
- **El Jefe Challenge** — complete 200 hands without feedback. Scores of 190/200 or better earn an El Jefe Approved certificate; a perfect 200/200 earns the special **Grand Master — Certified by El Jefe** certificate.

## Version 30 changes

- Allows vertical page scrolling when a touch gesture begins over the bankroll chart.
- Consolidates chart redraws into a single animation frame and skips redundant canvas work.
- Registers the service worker after the page becomes idle so startup remains responsive.
- Installs updates quietly and shows a footer notice instead of interrupting an active hand.
- Adds a user-controlled **Reload Now** button when a newer version is ready.
- Service-worker cache: `el-jefe-jacks-trainer-v30`.

## Version 21 changes

- Removed the crest watermark from the El Jefe Challenge button and mounted the crest at the center of the castle masthead.
- Restyled bankroll history and incorrect-hand review in the dark Casa del Jefe palette.
- Rebuilt ladder examples with the same centered rank and corner-suit card design used in Play.
- Removed the beige example capsules in favor of subtle dark holders.
- Standardized rung colors by hand family: royal, ordinary draw, 3SF, high-card/Broadway, special case, and none.
- Added the crest to the Return to Casa del Jefe link.

- Removed the “Video Poker Practice” eyebrow above the title.
- Clarified that the two made-hand groups are handled before the main ladder, using top/bottom wording that matches the stacked layout.
- Removed the internal coverage note from the bottom of the decision ladder.
- Removed the footer paytable shortcut and strategy-profile sentence; the full-pay 9/6 max-bet context remains in the header.
- Refined and recentered the Casa del Jefe crest.
- Added iPhone icon and rich sharing previews with the crest.
- Preserved simple rank-and-suit card faces.
- Renamed the never-break made-hand group “UNBREAKABLE”; high pairs remain in the separate breakable group.
- Kept the colored numbered ladder exclusively for non-made hands.
- Defined non-royal three-card straight-flush draws as “3SF” at first mention.
- Matched all example suit colors and switch badges to their actual ladder rungs.
- Service-worker cache: `el-jefe-jacks-trainer-v21`.

## Run locally

Open a terminal in this folder and run:

`py -m http.server 8000`

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

Replace the existing site files with the contents of this folder and commit them to the branch used by GitHub Pages. The included strategy JSON must be deployed beside `index.html`.


## Version 23 changes

- Combines session reset and incorrect-hand review into one full-width Session Review card.
- Standardizes the Play-area support widths for a cleaner layout consistent with Blackjack.
- Retains the Casa del Jefe crest card backs, decision ladder, and all Version 22 features.
- Service-worker cache: `el-jefe-jacks-trainer-v23`.

## Version 25 changes

- Shows the Casa del Jefe crest card backs before the first Play deal instead of gray placeholders.
- Uses dark emerald empty-card slots in Look Up, matching the visual treatment used by Blackjack.
- Service-worker cache: `el-jefe-jacks-trainer-v25`.


## Version 26 changes

- Changes the castle masthead title to **Video Poker Hall**.
- Restyles Lookup rank and suit entry buttons in the dark emerald-and-gold Casa palette.
- Places **Import from Play** before the manual result action, then keeps **Find Best Hold** as the final step below.
- Retains the darker empty Lookup card slots and branded initial Play card backs.
- Service-worker cache: `el-jefe-jacks-trainer-v26`.


## Version 27
- Restyled the Look Up optimal-hold result area to the Casa del Jefe dark emerald and gold theme.
- Removed the oversized light result bubble while preserving light card faces for readability.

## Version 28
- Prevents horizontal recentering when switching among Play, Train, and Look Up by reserving the browser scrollbar gutter.
- Removes the redundant wager amount from the Play deal-button labels.
- Links the masthead crest to the Casa del Jefe home page.
- Service-worker cache: `el-jefe-jacks-trainer-v28`.



## Version 29

- Standardized Play statistics as Balance / Accuracy / Bet in the Pai Gow-style top panel.
- Standardized Train statistics as Hands / Accuracy in the same top-panel system.
- Converted the Jacks or Better Play and Train rooms to the deeper green Pai Gow felt treatment.
- Updated the perfect Grand Master certificate to the shared Casa del Jefe Hall of Masters design.
- Service-worker cache: `el-jefe-jacks-trainer-v29`.
