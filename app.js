"use strict";

const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS = ["♥","♦","♣","♠"];
const SUIT_CLASSES = ["suit-hearts","suit-diamonds","suit-clubs","suit-spades"];
const ACTION_LABELS = { hit:"Hit", stand:"Stand", double:"Double", split:"Split" };
const TOTAL_CARDS = 312;
const BASE_WAGER = 1;

const $ = (selector) => document.querySelector(selector);
const elements = {
  modeTabs: $("#modeTabs"),
  tabs: [...document.querySelectorAll(".mode-tab")],
  trainPanel: $("#trainPanel"),
  trainScore: $("#trainScore"),
  trainDealer: $("#trainDealer"),
  trainPlayer: $("#trainPlayer"),
  trainActions: $("#trainActions"),
  trainFeedback: $("#trainFeedback"),
  trainNext: $("#trainNext"),
  trainScoreText: $("#trainScoreText"),
  trainPercent: $("#trainPercent"),
  resetTrainScore: $("#resetTrainScore"),
  lookupPanel: $("#lookupPanel"),
  lookupDealerPicker: $("#lookupDealerPicker"),
  lookupPlayerOnePicker: $("#lookupPlayerOnePicker"),
  lookupPlayerTwoPicker: $("#lookupPlayerTwoPicker"),
  lookupPreview: $("#lookupPreview"),
  lookupResult: $("#lookupResult"),
  lookupClear: $("#lookupClear"),
  playPanel: $("#playPanel"),
  playBalance: $("#playBalance"),
  playDealer: $("#playDealer"),
  dealerTotal: $("#dealerTotal"),
  playHands: $("#playHands"),
  playActions: $("#playActions"),
  playMessage: $("#playMessage"),
  dealButton: $("#dealButton"),
  shoeText: $("#shoeText"),
  shoeRemaining: $("#shoeRemaining"),
  shoeCut: $("#shoeCut"),
  shoeDealt: $("#shoeDealt"),
  resetPlay: $("#resetPlay"),
  challengeLaunch: $("#challengeLaunch"),
  challengePanel: $("#challengePanel"),
  challengeGame: $("#challengeGame"),
  challengeSummary: $("#challengeSummary"),
  challengeProgress: $("#challengeProgress"),
  challengeDealer: $("#challengeDealer"),
  challengePlayer: $("#challengePlayer"),
  challengeActions: $("#challengeActions"),
  challengeExit: $("#challengeExit")
};

const state = {
  mode: "train",
  train: {
    scenario: null,
    answered: false,
    attempts: Number(localStorage.getItem("blackjackTrainAttempts") || 0),
    correct: Number(localStorage.getItem("blackjackTrainCorrect") || 0)
  },
  lookup: { dealer: null, first: null, second: null },
  play: loadPlaySession(),
  challenge: { active:false, number:1, correct:0, scenario:null, finished:false }
};

function randomUint(maxExclusive) {
  if (maxExclusive <= 0) return 0;
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit);
  return buffer[0] % maxExclusive;
}

function randomFloat() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] / 0x100000000;
}

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomUint(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sixDeckShoe() {
  const cards = [];
  for (let deck = 0; deck < 6; deck += 1) {
    for (let card = 0; card < 52; card += 1) cards.push(card);
  }
  return shuffled(cards);
}

function rankOf(card) { return card % 13; }
function suitOf(card) { return Math.floor(card / 13); }
function rankValue(rank) {
  if (rank === 12) return 11;
  if (rank >= 8) return 10;
  return rank + 2;
}
function dealerValue(card) { return rankValue(rankOf(card)); }
function isTenValueRank(rank) { return rank >= 8 && rank <= 11; }
function cardFromRank(rank, suit = 0) { return suit * 13 + rank; }

function handInfo(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = rankOf(card);
    if (rank === 12) {
      aces += 1;
      total += 1;
    } else {
      total += rankValue(rank);
    }
  }
  let soft = false;
  if (aces > 0 && total + 10 <= 21) {
    total += 10;
    soft = true;
  }
  return {
    total,
    soft,
    bust: total > 21,
    blackjack: cards.length === 2 && total === 21
  };
}

function sameRankPair(cards) {
  return cards.length === 2 && rankOf(cards[0]) === rankOf(cards[1]);
}

function shouldSplitPair(rank, dealer) {
  if (rank === 12 || rank === 6) return true; // aces or eights
  if (isTenValueRank(rank) || rank === 3) return false; // tens or fives
  if (rank === 7) return [2,3,4,5,6,8,9].includes(dealer); // nines
  if (rank === 5) return dealer >= 2 && dealer <= 7; // sevens
  if (rank === 4) return dealer >= 2 && dealer <= 6; // sixes
  if (rank === 2) return dealer === 5 || dealer === 6; // fours
  if (rank === 1 || rank === 0) return dealer >= 2 && dealer <= 7; // threes/twos, DAS
  return false;
}

function strategyAction(cards, dealerCard, options = {}) {
  const canDouble = options.canDouble !== false && cards.length === 2;
  const canSplit = options.canSplit !== false && sameRankPair(cards);
  const dealer = dealerValue(dealerCard);

  if (canSplit) {
    const rank = rankOf(cards[0]);
    if (shouldSplitPair(rank, dealer)) return "split";
  }

  const info = handInfo(cards);
  const total = info.total;

  if (info.soft) {
    if (total <= 12) return "hit";
    if (total <= 14) return canDouble && dealer >= 5 && dealer <= 6 ? "double" : "hit";
    if (total <= 16) return canDouble && dealer >= 4 && dealer <= 6 ? "double" : "hit";
    if (total === 17) return canDouble && dealer >= 3 && dealer <= 6 ? "double" : "hit";
    if (total === 18) {
      if (canDouble && dealer >= 2 && dealer <= 6) return "double";
      if (dealer >= 2 && dealer <= 8) return "stand";
      return "hit";
    }
    if (total === 19) return canDouble && dealer === 6 ? "double" : "stand";
    return "stand";
  }

  if (total <= 8) return "hit";
  if (total === 9) return canDouble && dealer >= 3 && dealer <= 6 ? "double" : "hit";
  if (total === 10) return canDouble && dealer >= 2 && dealer <= 9 ? "double" : "hit";
  if (total === 11) return canDouble ? "double" : "hit"; // H17: double versus ace too
  if (total === 12) return dealer >= 4 && dealer <= 6 ? "stand" : "hit";
  if (total >= 13 && total <= 16) return dealer >= 2 && dealer <= 6 ? "stand" : "hit";
  return "stand";
}

function cardElement(card, options = {}) {
  const div = document.createElement("div");
  div.className = `card${options.small ? " small" : ""}${options.back ? " card-back" : ""}`;
  if (options.back) return div;

  const rank = rankOf(card);
  const suit = suitOf(card);
  div.innerHTML = `
    <span class="card-suit card-suit-top ${SUIT_CLASSES[suit]}">${SUITS[suit]}</span>
    <span class="card-rank ${SUIT_CLASSES[suit]}">${RANKS[rank]}</span>
    <span class="card-suit card-suit-bottom ${SUIT_CLASSES[suit]}">${SUITS[suit]}</span>`;
  return div;
}

function renderHand(container, cards, options = {}) {
  container.replaceChildren();
  cards.forEach((card, index) => {
    const hidden = options.hideFromIndex !== undefined && index >= options.hideFromIndex;
    container.append(cardElement(card, { back:hidden, small:options.small }));
  });
  if (options.extraBacks) {
    for (let i = 0; i < options.extraBacks; i += 1) container.append(cardElement(0, { back:true }));
  }
}

function scenarioFromFreshShoe() {
  while (true) {
    const cards = sixDeckShoe();
    const player = [cards[0], cards[2]];
    const dealer = [cards[1], cards[3]];
    if (handInfo(player).blackjack || handInfo(dealer).blackjack) continue;
    return { player, dealer };
  }
}

function availableInitialActions(cards) {
  const actions = ["hit", "stand", "double"];
  if (sameRankPair(cards)) actions.push("split");
  return actions;
}

function renderActionButtons(container, actions, handler) {
  container.replaceChildren();
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action-button ${action}`;
    button.textContent = ACTION_LABELS[action];
    button.addEventListener("click", () => handler(action));
    container.append(button);
  });
}

function switchMode(mode) {
  state.mode = mode;
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  elements.trainPanel.classList.toggle("hidden", mode !== "train");
  elements.trainScore.classList.toggle("hidden", mode !== "train");
  elements.lookupPanel.classList.toggle("hidden", mode !== "lookup");
  elements.playPanel.classList.toggle("hidden", mode !== "play");
  if (mode === "lookup") renderLookup();
  if (mode === "play") renderPlay();
}

function newTrainHand() {
  state.train.scenario = scenarioFromFreshShoe();
  state.train.answered = false;
  elements.trainFeedback.textContent = "";
  elements.trainFeedback.className = "feedback";
  renderTrain();
}

function renderTrain() {
  const { player, dealer } = state.train.scenario;
  renderHand(elements.trainDealer, [dealer[0]]);
  elements.trainDealer.append(cardElement(dealer[1], { back:true }));
  renderHand(elements.trainPlayer, player);
  renderActionButtons(elements.trainActions, availableInitialActions(player), answerTrain);
  [...elements.trainActions.children].forEach((button) => button.disabled = state.train.answered);
  elements.trainNext.disabled = !state.train.answered;
  elements.trainScoreText.textContent = `${state.train.correct} / ${state.train.attempts}`;
  const percent = state.train.attempts ? 100 * state.train.correct / state.train.attempts : 0;
  elements.trainPercent.textContent = `${percent.toFixed(1)}%`;
}

function answerTrain(action) {
  if (state.train.answered) return;
  const correctAction = strategyAction(state.train.scenario.player, state.train.scenario.dealer[0]);
  const correct = action === correctAction;
  state.train.attempts += 1;
  if (correct) state.train.correct += 1;
  state.train.answered = true;
  localStorage.setItem("blackjackTrainAttempts", String(state.train.attempts));
  localStorage.setItem("blackjackTrainCorrect", String(state.train.correct));
  elements.trainFeedback.textContent = correct ? "Correct!" : `Incorrect. Basic strategy says ${ACTION_LABELS[correctAction]}.`;
  elements.trainFeedback.className = `feedback ${correct ? "correct" : "incorrect"}`;
  renderTrain();
}

function buildRankPicker(container, field) {
  container.replaceChildren();
  RANKS.forEach((label, rank) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rank-button";
    button.textContent = label;
    button.classList.toggle("active", state.lookup[field] === rank);
    button.addEventListener("click", () => {
      state.lookup[field] = rank;
      renderLookup();
    });
    container.append(button);
  });
}

function renderLookup() {
  buildRankPicker(elements.lookupDealerPicker, "dealer");
  buildRankPicker(elements.lookupPlayerOnePicker, "first");
  buildRankPicker(elements.lookupPlayerTwoPicker, "second");
  elements.lookupPreview.replaceChildren();

  const dealerGroup = document.createElement("div");
  dealerGroup.className = "lookup-preview-group";
  dealerGroup.innerHTML = '<span class="lookup-preview-label">Dealer</span>';
  if (state.lookup.dealer !== null) dealerGroup.append(cardElement(cardFromRank(state.lookup.dealer, 3), { small:true }));
  elements.lookupPreview.append(dealerGroup);

  const playerGroup = document.createElement("div");
  playerGroup.className = "lookup-preview-group";
  playerGroup.innerHTML = '<span class="lookup-preview-label">You</span>';
  const playerHand = document.createElement("div");
  playerHand.className = "hand";
  if (state.lookup.first !== null) playerHand.append(cardElement(cardFromRank(state.lookup.first, 0), { small:true }));
  if (state.lookup.second !== null) playerHand.append(cardElement(cardFromRank(state.lookup.second, state.lookup.second === state.lookup.first ? 1 : 2), { small:true }));
  playerGroup.append(playerHand);
  elements.lookupPreview.append(playerGroup);

  if ([state.lookup.dealer, state.lookup.first, state.lookup.second].every((x) => x !== null)) {
    const dealer = cardFromRank(state.lookup.dealer, 3);
    const player = [cardFromRank(state.lookup.first, 0), cardFromRank(state.lookup.second, state.lookup.second === state.lookup.first ? 1 : 2)];
    const action = strategyAction(player, dealer);
    const info = handInfo(player);
    elements.lookupResult.textContent = `${info.soft ? "Soft " : ""}${info.total}: ${ACTION_LABELS[action]}`;
  } else {
    elements.lookupResult.textContent = "";
  }
}

function newPlaySession() {
  const shoe = sixDeckShoe();
  return {
    balance:0,
    shoe,
    shoePosition:0,
    cutPosition:Math.floor(TOTAL_CARDS * (0.80 + 0.10 * randomFloat())),
    round:null,
    busy:false,
    message:""
  };
}

function loadPlaySession() {
  try {
    const stored = JSON.parse(localStorage.getItem("blackjackPlaySession") || "null");
    if (stored && Array.isArray(stored.shoe) && stored.shoe.length === TOTAL_CARDS && Number.isFinite(stored.shoePosition) && Number.isFinite(stored.cutPosition)) {
      return { ...stored, round:null, busy:false, message:"" };
    }
  } catch (_) {}
  return newPlaySession();
}

function savePlaySession() {
  localStorage.setItem("blackjackPlaySession", JSON.stringify({
    balance:state.play.balance,
    shoe:state.play.shoe,
    shoePosition:state.play.shoePosition,
    cutPosition:state.play.cutPosition
  }));
}

function reshufflePlayShoe() {
  state.play.shoe = sixDeckShoe();
  state.play.shoePosition = 0;
  state.play.cutPosition = Math.floor(TOTAL_CARDS * (0.80 + 0.10 * randomFloat()));
}

function ensureShoe() {
  if (state.play.shoePosition >= state.play.cutPosition || TOTAL_CARDS - state.play.shoePosition < 60) reshufflePlayShoe();
}

function drawCard() {
  if (state.play.shoePosition >= TOTAL_CARDS) reshufflePlayShoe();
  const card = state.play.shoe[state.play.shoePosition];
  state.play.shoePosition += 1;
  return card;
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function formatUnits(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(Number.isInteger(rounded) ? 0 : 1)} ${Math.abs(rounded) === 1 ? "unit" : "units"}`;
}
function signedUnits(value) {
  const rounded = Math.round(value * 10) / 10;
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded.toFixed(Number.isInteger(rounded) ? 0 : 1)} ${Math.abs(rounded) === 1 ? "unit" : "units"}`;
}

async function dealPlayRound() {
  if (state.play.busy || (state.play.round && state.play.round.stage !== "complete")) return;
  ensureShoe();
  state.play.busy = true;
  state.play.balance -= BASE_WAGER;
  const balanceBefore = state.play.balance + BASE_WAGER;
  state.play.round = {
    stage:"dealing",
    dealer:[],
    hands:[{ cards:[], bet:BASE_WAGER, status:"active", fromSplit:false, splitAces:false, outcome:"" }],
    activeIndex:0,
    balanceBefore
  };
  state.play.message = "Dealing…";
  renderPlay();

  state.play.round.hands[0].cards.push(drawCard()); renderPlay(); await sleep(150);
  state.play.round.dealer.push(drawCard()); renderPlay(); await sleep(150);
  state.play.round.hands[0].cards.push(drawCard()); renderPlay(); await sleep(150);
  state.play.round.dealer.push(drawCard()); renderPlay(); await sleep(170);

  const playerInfo = handInfo(state.play.round.hands[0].cards);
  const dealerInfo = handInfo(state.play.round.dealer);
  if (dealerInfo.blackjack || playerInfo.blackjack) {
    resolveNaturals(playerInfo.blackjack, dealerInfo.blackjack);
    return;
  }

  state.play.round.stage = "player";
  state.play.message = "Choose an action.";
  state.play.busy = false;
  renderPlay();
}

function resolveNaturals(playerBlackjack, dealerBlackjack) {
  const round = state.play.round;
  round.stage = "complete";
  if (playerBlackjack && dealerBlackjack) {
    state.play.balance += BASE_WAGER;
    round.hands[0].outcome = "Push";
    state.play.message = "Both have blackjack. Push.";
  } else if (dealerBlackjack) {
    round.hands[0].outcome = "Dealer blackjack";
    state.play.message = "Dealer blackjack.";
  } else {
    state.play.balance += 2.2 * BASE_WAGER;
    round.hands[0].outcome = "Blackjack pays 6:5";
    state.play.message = "Blackjack pays 6:5. You win 1.2 units.";
  }
  state.play.busy = false;
  savePlaySession();
  renderPlay();
}

function activePlayHand() {
  return state.play.round?.hands[state.play.round.activeIndex] || null;
}

function availablePlayActions() {
  const round = state.play.round;
  const hand = activePlayHand();
  if (!round || round.stage !== "player" || !hand || hand.status !== "active") return [];
  const actions = ["hit", "stand"];
  if (hand.cards.length === 2 && !hand.splitAces) actions.push("double");
  if (hand.cards.length === 2 && sameRankPair(hand.cards) && round.hands.length < 4 && !(hand.fromSplit && rankOf(hand.cards[0]) === 12)) actions.push("split");
  return actions;
}

async function playAction(action) {
  if (state.play.busy) return;
  const round = state.play.round;
  const hand = activePlayHand();
  if (!round || round.stage !== "player" || !hand || !availablePlayActions().includes(action)) return;
  state.play.busy = true;

  if (action === "hit") {
    hand.cards.push(drawCard());
    renderPlay();
    await sleep(170);
    const info = handInfo(hand.cards);
    if (info.bust) { hand.status = "bust"; hand.outcome = "Bust"; }
    else if (info.total === 21) hand.status = "done";
  }

  if (action === "stand") hand.status = "done";

  if (action === "double") {
    state.play.balance -= hand.bet;
    hand.bet *= 2;
    hand.cards.push(drawCard());
    renderPlay();
    await sleep(180);
    const info = handInfo(hand.cards);
    hand.status = info.bust ? "bust" : "done";
    if (info.bust) hand.outcome = "Bust";
  }

  if (action === "split") {
    await splitActiveHand();
  }

  state.play.busy = false;
  await advancePlay();
}

async function splitActiveHand() {
  const round = state.play.round;
  const index = round.activeIndex;
  const old = round.hands[index];
  const aceSplit = rankOf(old.cards[0]) === 12;
  state.play.balance -= old.bet;

  const first = { cards:[old.cards[0]], bet:old.bet, status:"active", fromSplit:true, splitAces:aceSplit, outcome:"" };
  const second = { cards:[old.cards[1]], bet:old.bet, status:"active", fromSplit:true, splitAces:aceSplit, outcome:"" };
  round.hands.splice(index, 1, first, second);
  first.cards.push(drawCard()); renderPlay(); await sleep(160);
  second.cards.push(drawCard()); renderPlay(); await sleep(160);
  if (aceSplit) {
    first.status = "done";
    second.status = "done";
  }
}

async function advancePlay() {
  const round = state.play.round;
  if (!round || round.stage !== "player") return;
  const current = round.hands[round.activeIndex];
  if (current && current.status === "active") {
    renderPlay();
    return;
  }
  const next = round.hands.findIndex((hand, index) => index > round.activeIndex && hand.status === "active");
  if (next >= 0) {
    round.activeIndex = next;
    state.play.message = `Playing hand ${next + 1} of ${round.hands.length}.`;
    renderPlay();
    return;
  }
  await dealerTurn();
}

async function dealerTurn() {
  const round = state.play.round;
  round.stage = "dealer";
  state.play.busy = true;
  state.play.message = "Dealer plays.";
  renderPlay();
  await sleep(250);

  if (!round.hands.every((hand) => hand.status === "bust")) {
    while (true) {
      const info = handInfo(round.dealer);
      if (info.total < 17 || (info.total === 17 && info.soft)) {
        round.dealer.push(drawCard());
        renderPlay();
        await sleep(220);
      } else break;
    }
  }
  settleRound();
}

function settleRound() {
  const round = state.play.round;
  const dealer = handInfo(round.dealer);
  round.hands.forEach((hand) => {
    const player = handInfo(hand.cards);
    if (player.bust) {
      hand.outcome = "Lose";
    } else if (dealer.bust || player.total > dealer.total) {
      state.play.balance += 2 * hand.bet;
      hand.outcome = `Win ${formatUnits(hand.bet)}`;
    } else if (player.total === dealer.total) {
      state.play.balance += hand.bet;
      hand.outcome = "Push";
    } else {
      hand.outcome = "Lose";
    }
    hand.status = "done";
  });
  round.stage = "complete";
  state.play.busy = false;
  const net = state.play.balance - round.balanceBefore;
  state.play.message = `Round complete. Net ${signedUnits(net)}.`;
  savePlaySession();
  renderPlay();
}

function renderPlay() {
  const play = state.play;
  elements.playBalance.textContent = formatUnits(play.balance);
  const dealtPct = 100 * play.shoePosition / TOTAL_CARDS;
  const cutPct = 100 * play.cutPosition / TOTAL_CARDS;
  elements.shoeDealt.style.width = `${Math.min(100, dealtPct)}%`;
  elements.shoeCut.style.left = `${cutPct}%`;
  elements.shoeRemaining.style.left = `calc(${Math.min(100, dealtPct)}% + 4px)`;
  elements.shoeText.textContent = `${TOTAL_CARDS - play.shoePosition} cards remain`;

  elements.playDealer.replaceChildren();
  elements.playHands.replaceChildren();
  elements.playActions.replaceChildren();
  elements.dealerTotal.textContent = "";

  const round = play.round;
  if (!round) {
    elements.playDealer.append(cardElement(0, { back:true }));
    elements.playDealer.append(cardElement(0, { back:true }));
    elements.playMessage.textContent = "Deal a hand to begin.";
    elements.dealButton.textContent = "Deal";
    elements.dealButton.disabled = play.busy;
    return;
  }

  round.dealer.forEach((card, index) => {
    const hideHole = index === 1 && !["dealer","complete"].includes(round.stage);
    elements.playDealer.append(cardElement(card, { back:hideHole }));
  });
  while (elements.playDealer.children.length < 2 && round.stage === "dealing") elements.playDealer.append(cardElement(0, { back:true }));
  if (["dealer","complete"].includes(round.stage)) {
    const info = handInfo(round.dealer);
    elements.dealerTotal.textContent = info.bust ? `Bust (${info.total})` : `${info.soft ? "Soft " : ""}${info.total}`;
  }

  round.hands.forEach((hand, index) => {
    const box = document.createElement("div");
    box.className = `player-hand-box${round.stage === "player" && index === round.activeIndex ? " active" : ""}`;
    const cardRow = document.createElement("div");
    cardRow.className = "hand";
    hand.cards.forEach((card) => cardRow.append(cardElement(card)));
    const info = handInfo(hand.cards);
    const meta = document.createElement("div");
    meta.className = "hand-meta";
    meta.textContent = `${round.hands.length > 1 ? `Hand ${index + 1} · ` : ""}${info.soft && !info.bust ? "Soft " : ""}${info.total || ""} · Bet ${formatUnits(hand.bet)}`;
    const outcome = document.createElement("div");
    outcome.className = "hand-outcome";
    outcome.textContent = hand.outcome;
    box.append(cardRow, meta, outcome);
    elements.playHands.append(box);
  });

  if (round.stage === "player") renderActionButtons(elements.playActions, availablePlayActions(), playAction);
  elements.playMessage.textContent = play.message;
  elements.dealButton.textContent = round.stage === "complete" ? "New Hand" : "Deal";
  elements.dealButton.disabled = play.busy || round.stage !== "complete";
}

function startChallenge() {
  state.challenge = { active:true, number:1, correct:0, scenario:scenarioFromFreshShoe(), finished:false };
  elements.modeTabs.classList.add("hidden");
  elements.challengeLaunch.classList.add("hidden");
  elements.trainPanel.classList.add("hidden");
  elements.trainScore.classList.add("hidden");
  elements.lookupPanel.classList.add("hidden");
  elements.playPanel.classList.add("hidden");
  elements.challengePanel.classList.remove("hidden");
  elements.challengeGame.classList.remove("hidden");
  elements.challengeSummary.classList.add("hidden");
  renderChallenge();
}

function renderChallenge() {
  const c = state.challenge;
  elements.challengeProgress.textContent = `Hand ${c.number} of 200`;
  renderHand(elements.challengeDealer, [c.scenario.dealer[0]]);
  elements.challengeDealer.append(cardElement(c.scenario.dealer[1], { back:true }));
  renderHand(elements.challengePlayer, c.scenario.player);
  renderActionButtons(elements.challengeActions, availableInitialActions(c.scenario.player), answerChallenge);
}

function answerChallenge(action) {
  const c = state.challenge;
  if (!c.active || c.finished) return;
  const correctAction = strategyAction(c.scenario.player, c.scenario.dealer[0]);
  if (action === correctAction) c.correct += 1;
  if (c.number >= 200) {
    c.finished = true;
    renderChallengeSummary();
  } else {
    c.number += 1;
    c.scenario = scenarioFromFreshShoe();
    renderChallenge();
  }
}

function renderChallengeSummary() {
  const c = state.challenge;
  const percent = 100 * c.correct / 200;
  const passed = c.correct >= 190;
  elements.challengeGame.classList.add("hidden");
  elements.challengeSummary.classList.remove("hidden");
  const today = new Intl.DateTimeFormat(undefined, { year:"numeric", month:"long", day:"numeric" }).format(new Date());
  elements.challengeSummary.innerHTML = passed ? `
    <div class="certificate">
      <div class="certificate-small">CERTIFICATE OF BLACKJACK READINESS</div>
      <div class="certificate-title">EL JEFE APPROVED</div>
      <div class="certificate-rule"></div>
      <p>This certifies that the bearer completed the 200-hand El Jefe Blackjack Challenge with:</p>
      <div class="certificate-score">${c.correct} / 200 · ${percent.toFixed(1)}%</div>
      <p>You are now approved to play blackjack in Las Vegas.</p>
      <p>${today}</p>
      <div class="certificate-share">Screenshot this certificate and send it to the group text thread.</div>
    </div>
    <div class="challenge-summary-actions">
      <button class="primary" id="challengeAgain">Try Again</button>
      <button id="challengeDone">Done</button>
    </div>` : `
    <div class="challenge-fail">
      <h2>Not quite El Jefe approved</h2>
      <div class="challenge-final-score">${c.correct} / 200 · ${percent.toFixed(1)}%</div>
      <p>You are not quite ready to put money on a blackjack table. Practice the weak spots and try the challenge again.</p>
    </div>
    <div class="challenge-summary-actions">
      <button class="primary" id="challengeAgain">Try Again</button>
      <button id="challengeDone">Done</button>
    </div>`;
  $("#challengeAgain").addEventListener("click", startChallenge);
  $("#challengeDone").addEventListener("click", exitChallenge);
}

function exitChallenge() {
  state.challenge.active = false;
  elements.challengePanel.classList.add("hidden");
  elements.modeTabs.classList.remove("hidden");
  elements.challengeLaunch.classList.remove("hidden");
  switchMode(state.mode);
}

elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode)));
elements.trainNext.addEventListener("click", newTrainHand);
elements.resetTrainScore.addEventListener("click", () => {
  state.train.attempts = 0;
  state.train.correct = 0;
  localStorage.setItem("blackjackTrainAttempts", "0");
  localStorage.setItem("blackjackTrainCorrect", "0");
  renderTrain();
});
elements.lookupClear.addEventListener("click", () => {
  state.lookup = { dealer:null, first:null, second:null };
  renderLookup();
});
elements.dealButton.addEventListener("click", dealPlayRound);
elements.resetPlay.addEventListener("click", () => {
  if (!confirm("Reset the balance to zero and shuffle a fresh six-deck shoe?")) return;
  state.play = newPlaySession();
  savePlaySession();
  renderPlay();
});
elements.challengeLaunch.addEventListener("click", startChallenge);
elements.challengeExit.addEventListener("click", exitChallenge);

newTrainHand();
renderLookup();
renderPlay();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(console.error));
}
