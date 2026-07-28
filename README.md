# Casa del Jefe — Blackjack Salon

A mobile-friendly Progressive Web App built with plain HTML, CSS, and JavaScript.

## Modes

- **Play:** full blackjack hands from a persistent six-deck shoe, with basic-strategy accuracy, session mistake review, and an optimal-play bankroll comparison.
- **Train:** first-decision strategy practice with an optional filter for pairs and soft A-2 through A-9 hands.
- **Look Up:** enter a dealer upcard and two player cards, or open the complete in-app basic-strategy tables.
- **El Jefe Challenge:** 200 silent-scored decisions; 196 correct answers (98%) are required to pass. A perfect score earns the Blackjack Grand Master certificate.

## Rule profile

- Six decks
- Dealer hits soft 17
- Dealer peeks for blackjack
- Double on any first two cards
- Double after split
- Split to a maximum of four hands
- No resplitting aces
- One card only to each split ace
- No surrender
- Blackjack pays 6:5
- One-unit base wager in Play mode
- Cut card randomized between 80% and 90% penetration

The in-app table and all gameplay decisions use the same H17, DAS, no-surrender strategy engine.

## Session mistake review

Play mode records every incorrect hit, stand, double, or split decision, including decisions made after hitting or splitting. The review list is saved with the current session and is cleared by **Reset balance, history, and reshuffle**.

## Play graph

Play mode tracks two cumulative balances:

- **Your play:** green above zero and red below zero.
- **Optimal play:** a gold counterfactual line.

For each completed round, the app clones the remaining card order immediately after the initial deal and plays that round using basic strategy. The shadow round does not consume cards from the real shoe or affect later deals.

## Test locally

Open PowerShell in this folder and run:

`py -m http.server 8000`

Then open `http://localhost:8000`.


## Version 12 changes

- Removed the crest watermark from the El Jefe Challenge button.
- Mounted the crest at the center of the castle masthead.
- Restyled bankroll history and session mistake review in the dark Casa del Jefe palette.
- Added the crest to the Return to Casa del Jefe link.
- Updated chart colors for stronger contrast on the dark background.
- Service-worker cache: `el-jefe-blackjack-v12`.


## Version 14 changes

- Added the Casa del Jefe crest card backs.
- Restyled the Complete Basic Strategy area in the black, emerald, cream, and gold Casa palette.
- Made all strategy tables substantially more compact.
- Removed unnecessary cell gridlines; the rounded action chips now carry the visual structure.
- Reduced section spacing, labels, and row heights for better mobile fit.
- Service-worker cache: `el-jefe-blackjack-v14`.


## Version 15 changes

- Keeps Hit, Stand, Double, and Split in fixed Play positions; unavailable choices become invisible without shifting the remaining buttons.
- Rebuilds Train with the same right-side action rail and a New Hand button below the cards.
- Combines session reset and incorrect-decision review into one full-width Session Review card.
- Standardizes the widths of the table, bankroll chart, and session area.
- Includes the Casa del Jefe crest card backs and compact dark Basic Strategy tables.
- Service-worker cache: `el-jefe-blackjack-v15`.

## Version 17 changes

- Places Hit and Stand in a fixed top row, with Double and Split in a fixed second row.
- Unavailable actions remain invisible without shifting the other buttons.
- Uses the same centered two-by-two action grid in Play and Train on desktop and mobile.
- Keeps Deal and New Hand centered below the action grid.
- Service-worker cache: `el-jefe-blackjack-v17`.


## Version 18 changes

- Centers the dealer cards, player cards, action grid, and Deal button within the full Blackjack felt.
- Keeps the compact six-deck shoe overlaid at the left without shifting the main play area.
- Retains the fixed two-by-two Hit/Stand and Double/Split layout in Play and Train.
- Service-worker cache: `el-jefe-blackjack-v18`.

## Version 19 changes

- Reserves a fixed-height dealer-total/status slot in Play mode.
- Prevents the dealer total appearing after the hole card is revealed from nudging the cards, action buttons, or Deal button.
- Normal one-hit and stand hands remain stationary; genuine card wrapping can still increase the hand area as intended.
- Service-worker cache: `el-jefe-blackjack-v19`.


## Version 20 changes

- Play and Train action controls now mirror the Basic Strategy legend.
- Each neutral action button contains the same color-coded letter badge used in the strategy tables: H, S, D, and P.
- Fixed action positions and the two-row layout are unchanged.
- Service-worker cache: `el-jefe-blackjack-v20`.
