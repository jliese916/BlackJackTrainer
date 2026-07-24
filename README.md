# El Jefe's Blackjack Trainer

A mobile-friendly Progressive Web App built with plain HTML, CSS, and JavaScript.

## Modes

- **Train:** first-decision basic-strategy practice with score and percentage.
- **Look Up:** select a dealer card, then tap two player cards into outlined card slots.
- **Play:** full blackjack hands using a persistent six-deck shoe.
- **El Jefe Challenge:** 200 silent-scored decisions; 196 correct answers (98%) are required to pass.

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

The basic strategy follows the [Wizard of Odds 4-to-8-deck chart](https://wizardofodds.com/games/blackjack/strategy/4-decks/) using the H17, DAS, no-surrender profile.

## Play graph

Play mode tracks two cumulative balances:

- **Your play:** green above zero and red below zero.
- **Optimal play:** a gray counterfactual line.

For each completed round, the app clones the remaining card order immediately
after the initial deal and plays that one round using basic strategy. The shadow
round does not consume cards from the real shoe or affect later deals. The graph
shows the current `Optimal - you` delta with a bracket at the latest point.

## Test on Windows

Open PowerShell in this folder and run:

`py -m http.server 8000`

Then open:

`http://localhost:8000`

## Publish with GitHub Pages

Upload the files directly to the root of a public GitHub repository, then enable
GitHub Pages from the `main` branch and `/ (root)` folder.

## Link to the Jacks or Better app

The footer link uses:

`../jacks-or-better-trainer/`

This works when both projects are GitHub Pages repositories under the same
GitHub username and the video-poker repository is named
`jacks-or-better-trainer`.

## Version 4 changes

- The six-deck shoe is on the left, the player-action rail is on the right, and dealer/player cards stay centered in the middle.
- Removed the Mandalay Bay affiliation disclaimer from the Play screen.
- The vertical shoe is bottom-justified: used-card space grows from the top, and the cut-card marker slides downward with the remaining stack.
- The strategy profile links directly to the Wizard of Odds chart used by the trainer.

- The El Jefe Challenge now requires 196 of 200 correct decisions (98%) to pass.
- Service-worker cache: `el-jefe-blackjack-v4`.
