# El Jefe's Blackjack Trainer

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
- **Optimal play:** a gray counterfactual line.

For each completed round, the app clones the remaining card order immediately after the initial deal and plays that round using basic strategy. The shadow round does not consume cards from the real shoe or affect later deals.

## Test locally

Open PowerShell in this folder and run:

`py -m http.server 8000`

Then open `http://localhost:8000`.

## Version 11 changes

- Play, Train, and Look Up tab order, with Play opening first.
- Removed the top practice label and external strategy-profile link.
- Renamed the table **Casa del Jefe — Blackjack Salon**.
- Added complete, color-coded Pair, Soft, and Hard strategy tables under Look Up.
- Added focused Train mode for pairs and A-2 through A-9.
- Added a persistent session review for mistakes made at any decision point.
- Added a special Blackjack Grand Master certificate for 200/200.
- - Refined and recentered the Casa del Jefe crest.
- Added iPhone icon and rich sharing previews with the crest.
- Preserved simple rank-and-suit card faces.
- Updated the Casa motto to “Train. Master. Punish.”
- Service-worker cache: `el-jefe-blackjack-v11`.
