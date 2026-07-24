# El Jefe's Blackjack Trainer

A mobile-friendly Progressive Web App built with plain HTML, CSS, and JavaScript.

## Modes

- **Train:** first-decision basic-strategy practice with score and percentage.
- **Look Up:** choose the dealer upcard and the player's two ranks.
- **Play:** full blackjack hands using a persistent six-deck shoe.
- **El Jefe Challenge:** 200 silent-scored decisions; 95% is required to pass.

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

The basic strategy follows the 4-to-8-deck H17, DAS, no-surrender profile.

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

## Branding note

The Play screen uses a Mandalay Bay-inspired table treatment and text wordmark.
It is an unofficial practice tool and is not affiliated with Mandalay Bay or
MGM Resorts.
