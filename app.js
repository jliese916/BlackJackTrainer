"use strict";

const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS = ["♥","♦","♣","♠"];
const SUIT_CLASSES = ["suit-hearts","suit-diamonds","suit-clubs","suit-spades"];
const ACTION_LABELS = { hit:"Hit", stand:"Stand", double:"Double", split:"Split" };
const ACTION_SHORTCUTS = { hit:"H", stand:"S", double:"D", split:"P" };
const TOTAL_CARDS = 312;
const BASE_WAGER = 1;
const APP_VERSION = "28";

const $ = (selector) => document.querySelector(selector);
const elements = {
  modeTabs: $("#modeTabs"),
  tabs: [...document.querySelectorAll(".mode-tab")],
  trainPanel: $("#trainPanel"),
  trainScore: $("#trainScore"),
  trainDealer: $("#trainDealer"),
  trainDealerTotal: $("#trainDealerTotal"),
  trainHands: $("#trainHands"),
  trainActions: $("#trainActions"),
  trainFeedback: $("#trainFeedback"),
  trainNext: $("#trainNext"),
  trainScoreText: $("#trainScoreText"),
  trainPercent: $("#trainPercent"),
  resetTrainScore: $("#resetTrainScore"),
  trainFocusedHands: $("#trainFocusedHands"),
  lookupPanel: $("#lookupPanel"),
  lookupDealerTarget: $("#lookupDealerTarget"),
  lookupPlayerTarget: $("#lookupPlayerTarget"),
  lookupDealerSlot: $("#lookupDealerSlot"),
  lookupPlayerSlots: $("#lookupPlayerSlots"),
  lookupPickerLabel: $("#lookupPickerLabel"),
  lookupRankPicker: $("#lookupRankPicker"),
  lookupResult: $("#lookupResult"),
  lookupClear: $("#lookupClear"),
  strategyTableContainer: $("#strategyTableContainer"),
  playPanel: $("#playPanel"),
  playBalance: $("#playBalance"),
  playAccuracy: $("#playAccuracy"),
  playDecisionIndicator: $("#playDecisionIndicator"),
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
  playDeltaSummary: $("#playDeltaSummary"),
  playBalanceChart: $("#playBalanceChart"),
  playCompletedHands: $("#playCompletedHands"),
  playWins: $("#playWins"),
  playPushes: $("#playPushes"),
  playLosses: $("#playLosses"),
  resetPlay: $("#resetPlay"),
  playMistakeCount: $("#playMistakeCount"),
  playMistakeList: $("#playMistakeList"),
  challengeLaunch: $("#challengeLaunch"),
  challengePanel: $("#challengePanel"),
  challengeGame: $("#challengeGame"),
  challengeSummary: $("#challengeSummary"),
  challengeReview: $("#challengeReview"),
  challengeProgress: $("#challengeProgress"),
  challengeDealer: $("#challengeDealer"),
  challengeDealerTotal: $("#challengeDealerTotal"),
  challengeHands: $("#challengeHands"),
  challengeActions: $("#challengeActions"),
  challengeExit: $("#challengeExit"),
  updateNotice: $("#updateNotice"),
  reloadUpdate: $("#reloadUpdate")
};

let balanceChartFrame = 0;
let lastBalanceChartSignature = "";

const state = {
  mode: "play",
  train: {
    round: null,
    focusedHands: localStorage.getItem("blackjackTrainFocusedHands") === "true",
    attempts: Number(localStorage.getItem("blackjackTrainAttempts") || 0),
    correct: Number(localStorage.getItem("blackjackTrainCorrect") || 0)
  },
  lookup: { dealer:null, player:[], target:"dealer" },
  play: loadPlaySession(),
  challenge: { active:false, completedHands:0, correct:0, round:null, finished:false, misses:[] }
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

function handTotalLabel(cards) {
  const info = handInfo(cards);
  if (info.bust) return `Bust (${info.total})`;
  if (info.blackjack) return "Blackjack";
  return `${info.soft ? "Soft " : ""}${info.total}`;
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

function isFocusedTrainingHand(cards) {
  if (sameRankPair(cards)) return true;
  const ranks = cards.map(rankOf);
  const aceIndex = ranks.indexOf(12);
  if (aceIndex < 0) return false;
  const otherRank = ranks[aceIndex === 0 ? 1 : 0];
  return otherRank >= 0 && otherRank <= 7; // A-2 through A-9
}

function newPracticeHand(cards, options = {}) {
  return {
    cards:[...cards],
    status:options.status || "active",
    fromSplit:options.fromSplit === true,
    splitAces:options.splitAces === true,
    outcome:"",
    allDecisionsCorrect:options.allDecisionsCorrect !== false,
    decisionCount:Number.isFinite(options.decisionCount) ? options.decisionCount : 0,
    mistakes:Array.isArray(options.mistakes) ? options.mistakes.map((mistake) => ({ ...mistake, player:[...mistake.player] })) : []
  };
}

function practiceRoundFromFreshShoe(options = {}) {
  while (true) {
    const cards = sixDeckShoe();
    const player = [cards[0], cards[2]];
    const dealer = [cards[1], cards[3]];
    if (handInfo(player).blackjack || handInfo(dealer).blackjack) continue;
    if (options.focusedHands && !isFocusedTrainingHand(player)) continue;
    return {
      stage:"player",
      dealer,
      hands:[newPracticeHand(player)],
      activeIndex:0,
      drawPile:cards.slice(4),
      drawPosition:0,
      busy:false,
      scored:false,
      message:"Choose an action."
    };
  }
}

function drawPracticeCard(round) {
  const card = round.drawPile[round.drawPosition];
  round.drawPosition += 1;
  if (card === undefined) throw new Error("The practice shoe ran out of cards.");
  return card;
}

function availableInitialActions(cards) {
  const actions = ["hit", "stand", "double"];
  if (sameRankPair(cards)) actions.push("split");
  return actions;
}

const FIXED_ACTION_ORDER = ["hit", "stand", "double", "split"];

function renderActionButtons(container, actions, handler, options = {}) {
  container.replaceChildren();
  const actionSet = new Set(actions);
  const displayActions = options.fixedSlots ? FIXED_ACTION_ORDER : actions;

  displayActions.forEach((action) => {
    const available = actionSet.has(action);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action-button ${action}${available ? "" : " action-unavailable"}`;
    button.setAttribute("aria-label", ACTION_LABELS[action]);
    button.setAttribute("aria-keyshortcuts", ACTION_SHORTCUTS[action]);
    button.title = `${ACTION_LABELS[action]} (${ACTION_SHORTCUTS[action]})`;
    const key = document.createElement("span");
    key.className = `action-key strategy-${action}`;
    key.textContent = action === "split" ? "P" : action[0].toUpperCase();
    key.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "action-label";
    label.textContent = ACTION_LABELS[action];
    label.setAttribute("aria-hidden", "true");
    button.append(key, label);
    button.dataset.action = action;

    if (available) {
      button.addEventListener("click", () => handler(action));
    } else {
      button.disabled = true;
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
    }

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

function activePracticeHand(round) {
  return round?.hands[round.activeIndex] || null;
}

function availablePracticeActions(round) {
  const hand = activePracticeHand(round);
  if (!round || round.stage !== "player" || round.busy || !hand || hand.status !== "active") return [];
  const actions = ["hit", "stand"];
  if (hand.cards.length === 2 && !hand.splitAces) actions.push("double");
  if (
    hand.cards.length === 2 &&
    sameRankPair(hand.cards) &&
    round.hands.length < 4 &&
    !(hand.fromSplit && rankOf(hand.cards[0]) === 12)
  ) actions.push("split");
  return actions;
}

function renderPracticeDealer(container, totalElement, round) {
  container.replaceChildren();
  const revealHole = ["dealer", "complete"].includes(round.stage);
  round.dealer.forEach((card, index) => {
    container.append(cardElement(card, { back:index === 1 && !revealHole }));
  });
  if (totalElement) {
    if (revealHole) {
      totalElement.textContent = handTotalLabel(round.dealer);
    } else {
      totalElement.textContent = "";
    }
  }
}

function renderPracticeHands(container, round) {
  container.replaceChildren();
  round.hands.forEach((hand, index) => {
    const box = document.createElement("div");
    box.className = `practice-hand-box${round.stage === "player" && index === round.activeIndex ? " active" : ""}`;

    const label = document.createElement("div");
    label.className = "zone-label";
    label.textContent = round.hands.length > 1 ? `Hand ${index + 1}` : "You";

    const cardRow = document.createElement("div");
    cardRow.className = "hand";
    hand.cards.forEach((card) => cardRow.append(cardElement(card)));

    const info = handInfo(hand.cards);
    const total = document.createElement("div");
    total.className = "practice-total";
    total.textContent = handTotalLabel(hand.cards);

    const outcome = document.createElement("div");
    outcome.className = "practice-hand-outcome";
    outcome.textContent = hand.outcome;

    box.append(label, cardRow, total, outcome);
    container.append(box);
  });
}

function renderPracticeActionArea(container, round, handler) {
  const actions = availablePracticeActions(round);
  renderActionButtons(container, actions, handler, { fixedSlots:true });
  [...container.children].forEach((button) => {
    button.disabled = round.busy || button.classList.contains("action-unavailable");
  });
}

function newTrainHand() {
  state.train.round = practiceRoundFromFreshShoe({ focusedHands:state.train.focusedHands });
  elements.trainFeedback.textContent = "Choose an action.";
  elements.trainFeedback.className = "feedback";
  renderTrain();
}

function renderTrain() {
  const round = state.train.round;
  if (!round) return;
  elements.trainFocusedHands.checked = state.train.focusedHands;
  renderPracticeDealer(elements.trainDealer, elements.trainDealerTotal, round);
  renderPracticeHands(elements.trainHands, round);
  renderPracticeActionArea(elements.trainActions, round, answerTrain);
  elements.trainNext.disabled = round.stage !== "complete" || round.busy;
  elements.trainScoreText.textContent = `${state.train.correct} / ${state.train.attempts}`;
  const percent = state.train.attempts ? 100 * state.train.correct / state.train.attempts : 0;
  elements.trainPercent.textContent = `${percent.toFixed(1)}%`;
}

async function answerTrain(action) {
  await practiceAction("train", action);
}

function recordPracticeDecision(mode, action, hand, availableActions) {
  const round = state[mode].round;
  const canDouble = availableActions.includes("double");
  const canSplit = availableActions.includes("split");
  const correctAction = strategyAction(hand.cards, round.dealer[0], { canDouble, canSplit });
  const wasCorrect = action === correctAction;

  hand.decisionCount += 1;
  hand.allDecisionsCorrect = hand.allDecisionsCorrect && wasCorrect;
  if (!wasCorrect) {
    hand.mistakes.push({
      dealerUp:round.dealer[0],
      player:[...hand.cards],
      chosen:action,
      correct:correctAction
    });
  }

  if (mode === "train") {
    elements.trainFeedback.textContent = wasCorrect
      ? "Correct. Continue the hand."
      : `Incorrect. Basic strategy says ${ACTION_LABELS[correctAction]}. Continue the hand.`;
    elements.trainFeedback.className = `feedback ${wasCorrect ? "correct" : "incorrect"}`;
  }
  return wasCorrect;
}

function renderPracticeMode(mode) {
  if (mode === "train") renderTrain();
  else renderChallenge();
}

async function practiceAction(mode, action) {
  const owner = state[mode];
  const round = owner.round;
  const hand = activePracticeHand(round);
  const availableActions = availablePracticeActions(round);
  if (!round || round.stage !== "player" || round.busy || !hand || !availableActions.includes(action)) return;

  recordPracticeDecision(mode, action, hand, availableActions);
  round.busy = true;

  if (action === "hit") {
    hand.cards.push(drawPracticeCard(round));
    renderPracticeMode(mode);
    await sleep(150);
    const info = handInfo(hand.cards);
    if (info.bust) {
      hand.status = "bust";
      hand.outcome = "Bust";
    } else if (info.total === 21) {
      hand.status = "done";
    }
  }

  if (action === "stand") hand.status = "done";

  if (action === "double") {
    hand.cards.push(drawPracticeCard(round));
    renderPracticeMode(mode);
    await sleep(160);
    const info = handInfo(hand.cards);
    hand.status = info.bust ? "bust" : "done";
    if (info.bust) hand.outcome = "Bust";
  }

  if (action === "split") {
    const index = round.activeIndex;
    const aceSplit = rankOf(hand.cards[0]) === 12;
    const inherited = {
      fromSplit:true,
      splitAces:aceSplit,
      allDecisionsCorrect:hand.allDecisionsCorrect,
      decisionCount:hand.decisionCount,
      mistakes:hand.mistakes
    };
    const first = newPracticeHand([hand.cards[0]], inherited);
    const second = newPracticeHand([hand.cards[1]], inherited);
    round.hands.splice(index, 1, first, second);

    first.cards.push(drawPracticeCard(round));
    renderPracticeMode(mode);
    await sleep(145);
    second.cards.push(drawPracticeCard(round));
    renderPracticeMode(mode);
    await sleep(145);

    if (aceSplit || handInfo(first.cards).total === 21) first.status = "done";
    if (aceSplit || handInfo(second.cards).total === 21) second.status = "done";
  }

  round.busy = false;
  await advancePracticeRound(mode);
}

async function advancePracticeRound(mode) {
  const round = state[mode].round;
  if (!round || round.stage !== "player") return;

  const current = activePracticeHand(round);
  if (current && current.status === "active") {
    renderPracticeMode(mode);
    return;
  }

  const next = round.hands.findIndex((hand, index) => index > round.activeIndex && hand.status === "active");
  if (next >= 0) {
    round.activeIndex = next;
    if (mode === "train") {
      elements.trainFeedback.textContent = `Continue with hand ${next + 1} of ${round.hands.length}.`;
      elements.trainFeedback.className = "feedback";
    }
    renderPracticeMode(mode);
    return;
  }

  await practiceDealerTurn(mode);
}

async function practiceDealerTurn(mode) {
  const round = state[mode].round;
  round.stage = "dealer";
  round.busy = true;
  renderPracticeMode(mode);
  await sleep(220);

  if (!round.hands.every((hand) => hand.status === "bust")) {
    while (true) {
      const info = handInfo(round.dealer);
      if (info.total < 17 || (info.total === 17 && info.soft)) {
        round.dealer.push(drawPracticeCard(round));
        renderPracticeMode(mode);
        await sleep(180);
      } else {
        break;
      }
    }
  }

  await settlePracticeRound(mode);
}

function settlePracticeOutcomes(round) {
  const dealer = handInfo(round.dealer);
  round.hands.forEach((hand) => {
    const player = handInfo(hand.cards);
    if (player.bust) hand.outcome = "Lose";
    else if (dealer.bust || player.total > dealer.total) hand.outcome = "Win";
    else if (player.total === dealer.total) hand.outcome = "Push";
    else hand.outcome = "Lose";
    hand.status = "done";
  });
  round.stage = "complete";
  round.busy = false;
}

function scoreTrainRound(round) {
  if (round.scored) return;
  const totalHands = round.hands.length;
  const perfectHands = round.hands.filter((hand) => hand.allDecisionsCorrect).length;
  state.train.attempts += totalHands;
  state.train.correct += perfectHands;
  round.scored = true;
  localStorage.setItem("blackjackTrainAttempts", String(state.train.attempts));
  localStorage.setItem("blackjackTrainCorrect", String(state.train.correct));
  elements.trainFeedback.textContent = `Round complete: ${perfectHands} of ${totalHands} ${totalHands === 1 ? "hand" : "hands"} played perfectly.`;
  elements.trainFeedback.className = `feedback ${perfectHands === totalHands ? "correct" : "incorrect"}`;
}

function scoreChallengeRound(round) {
  if (round.scored) return;
  const challenge = state.challenge;
  for (const hand of round.hands) {
    if (challenge.completedHands >= 200) break;
    challenge.completedHands += 1;
    if (hand.allDecisionsCorrect) {
      challenge.correct += 1;
    } else {
      challenge.misses.push({
        handNumber:challenge.completedHands,
        dealerUp:round.dealer[0],
        player:[...hand.cards],
        mistakes:hand.mistakes.map((mistake) => ({ ...mistake, player:[...mistake.player] }))
      });
    }
  }
  round.scored = true;
}

async function settlePracticeRound(mode) {
  const round = state[mode].round;
  settlePracticeOutcomes(round);

  if (mode === "train") {
    scoreTrainRound(round);
    renderTrain();
    return;
  }

  scoreChallengeRound(round);
  renderChallenge();
  await sleep(260);
  if (state.challenge.completedHands >= 200) {
    state.challenge.finished = true;
    renderChallengeSummary();
  } else {
    newChallengeRound();
  }
}

function lookupPlaceholder() {
  const slot = document.createElement("span");
  slot.className = "lookup-card-placeholder";
  return slot;
}

function renderLookupSlots() {
  elements.lookupDealerSlot.replaceChildren();
  elements.lookupPlayerSlots.replaceChildren();

  if (state.lookup.dealer === null) {
    elements.lookupDealerSlot.append(lookupPlaceholder());
  } else {
    elements.lookupDealerSlot.append(cardElement(cardFromRank(state.lookup.dealer, 3), { small:true }));
  }

  for (let index = 0; index < 2; index += 1) {
    const rank = state.lookup.player[index];
    if (rank === undefined) {
      elements.lookupPlayerSlots.append(lookupPlaceholder());
    } else {
      const suit = index === 0 ? 0 : (rank === state.lookup.player[0] ? 1 : 2);
      elements.lookupPlayerSlots.append(cardElement(cardFromRank(rank, suit), { small:true }));
    }
  }
}

function chooseLookupRank(rank) {
  if (state.lookup.target === "dealer") {
    state.lookup.dealer = rank;
    state.lookup.target = "player";
  } else if (state.lookup.player.length < 2) {
    state.lookup.player.push(rank);
  } else {
    state.lookup.player = [rank];
  }
  renderLookup();
}

function buildLookupRankPicker() {
  elements.lookupRankPicker.replaceChildren();
  RANKS.forEach((label, rank) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rank-button";
    button.textContent = label;
    button.addEventListener("click", () => chooseLookupRank(rank));
    elements.lookupRankPicker.append(button);
  });
}

function renderLookup() {
  elements.lookupDealerTarget.classList.toggle("active", state.lookup.target === "dealer");
  elements.lookupPlayerTarget.classList.toggle("active", state.lookup.target === "player");
  elements.lookupPickerLabel.textContent = state.lookup.target === "dealer"
    ? "Choose dealer card"
    : state.lookup.player.length < 2
      ? `Choose player card ${state.lookup.player.length + 1} of 2`
      : "Player cards complete — tap a rank to start over";

  renderLookupSlots();
  buildLookupRankPicker();

  if (state.lookup.dealer !== null && state.lookup.player.length === 2) {
    const dealer = cardFromRank(state.lookup.dealer, 3);
    const player = [
      cardFromRank(state.lookup.player[0], 0),
      cardFromRank(state.lookup.player[1], state.lookup.player[1] === state.lookup.player[0] ? 1 : 2)
    ];
    const action = strategyAction(player, dealer);
    elements.lookupResult.textContent = `${handTotalLabel(player)}: ${ACTION_LABELS[action]}`;
  } else {
    elements.lookupResult.textContent = "";
  }
}

const STRATEGY_DEALER_RANKS = [0,1,2,3,4,5,6,7,8,12];
const STRATEGY_DEALER_LABELS = ["2","3","4","5","6","7","8","9","10","A"];
const STRATEGY_ACTION_CODES = { hit:"H", stand:"S", double:"D", split:"P" };
const STRATEGY_ACTION_NAMES = { hit:"Hit", stand:"Stand", double:"Double", split:"Split" };

function strategyTableCell(action) {
  const cell = document.createElement("td");
  cell.className = "strategy-action";
  cell.title = STRATEGY_ACTION_NAMES[action];
  cell.setAttribute("aria-label", STRATEGY_ACTION_NAMES[action]);
  const chip = document.createElement("span");
  chip.className = `strategy-chip strategy-${action}`;
  chip.textContent = STRATEGY_ACTION_CODES[action];
  cell.append(chip);
  return cell;
}

function buildStrategySection(title, subtitle, rows) {
  const section = document.createElement("section");
  section.className = "strategy-table-section";

  const heading = document.createElement("div");
  heading.className = "strategy-table-heading";
  heading.innerHTML = `<h3>${title}</h3><p>${subtitle}</p>`;

  const scroll = document.createElement("div");
  scroll.className = "strategy-table-scroll";
  const table = document.createElement("table");
  table.className = "strategy-grid";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.scope = "col";
  corner.textContent = "Your hand";
  headerRow.append(corner);
  STRATEGY_DEALER_LABELS.forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headerRow.append(th);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = row.label;
    tr.append(label);
    STRATEGY_DEALER_RANKS.forEach((dealerRank) => {
      const action = strategyAction(row.cards(), cardFromRank(dealerRank, 3));
      tr.append(strategyTableCell(action));
    });
    tbody.append(tr);
  });
  table.append(thead, tbody);
  scroll.append(table);
  section.append(heading, scroll);
  return section;
}

function renderStrategyTables() {
  if (!elements.strategyTableContainer || elements.strategyTableContainer.childElementCount) return;

  const intro = document.createElement("div");
  intro.className = "strategy-table-intro";
  intro.innerHTML = `
    <p>Choose the table that matches your hand: Hard Totals, Soft Totals, or Pairs. Dealer upcards run across the top; each cell shows the correct two-card decision.</p>
    <div class="strategy-legend" aria-label="Strategy action legend">
      <span class="strategy-hit"><b>H</b> Hit</span>
      <span class="strategy-stand"><b>S</b> Stand</span>
      <span class="strategy-double"><b>D</b> Double</span>
      <span class="strategy-split"><b>P</b> Split</span>
    </div>`;

  const pairRanks = [0,1,2,3,4,5,6,7,8,12];
  const pairRows = pairRanks.map((rank) => ({
    label: rank === 8 ? "10-10*" : `${RANKS[rank]}-${RANKS[rank]}`,
    cards: () => [cardFromRank(rank, 0), cardFromRank(rank, 1)]
  }));

  const softRows = Array.from({ length:8 }, (_, index) => {
    const otherRank = index;
    return {
      label: `A-${RANKS[otherRank]}`,
      cards: () => [cardFromRank(12, 0), cardFromRank(otherRank, 1)]
    };
  });

  const hardRowSpecs = [
    ["5",0,1], ["6",0,2], ["7",1,2], ["8",1,3], ["9",2,3],
    ["10",2,4], ["11",3,4], ["12",3,5], ["13",4,5], ["14",4,6],
    ["15",5,6], ["16",5,7], ["17+",5,8]
  ];
  const hardRows = hardRowSpecs.map(([label, first, second]) => ({
    label,
    cards: () => [cardFromRank(first, 0), cardFromRank(second, 1)]
  }));

  const footnote = document.createElement("p");
  footnote.className = "strategy-table-footnote";
  footnote.innerHTML = "<strong>10-10 rule:</strong> Face-card pairs follow the 10-10 row. Surrender is not offered. When doubling or splitting is unavailable, the trainer recalculates the best legal action.";

  elements.strategyTableContainer.append(
    intro,
    buildStrategySection("Hard Totals", "Use this table when the hand is neither soft nor a pair.", hardRows),
    buildStrategySection("Soft Totals", "Use this table when an ace is being counted as 11.", softRows),
    buildStrategySection("Pairs", "Use this table when your first two cards have the same rank.", pairRows),
    footnote
  );
}

function simulateOptimalRound(initialPlayer, initialDealer, drawPile) {
  const playerInfo = handInfo(initialPlayer);
  const dealerInfo = handInfo(initialDealer);
  if (playerInfo.blackjack || dealerInfo.blackjack) {
    if (playerInfo.blackjack && dealerInfo.blackjack) return 0;
    if (dealerInfo.blackjack) return -BASE_WAGER;
    return 1.2 * BASE_WAGER;
  }

  let drawPosition = 0;
  const nextCard = () => {
    const card = drawPile[drawPosition];
    drawPosition += 1;
    if (card === undefined) throw new Error("The shadow shoe ran out of cards.");
    return card;
  };

  let net = -BASE_WAGER;
  const hands = [{
    cards:[...initialPlayer],
    bet:BASE_WAGER,
    status:"active",
    fromSplit:false,
    splitAces:false
  }];

  let handIndex = 0;
  while (handIndex < hands.length) {
    const hand = hands[handIndex];
    if (hand.status !== "active") {
      handIndex += 1;
      continue;
    }

    const info = handInfo(hand.cards);
    if (info.bust) {
      hand.status = "bust";
      handIndex += 1;
      continue;
    }
    if (info.total === 21 || hand.splitAces) {
      hand.status = "done";
      handIndex += 1;
      continue;
    }

    const canDouble = hand.cards.length === 2 && !hand.splitAces;
    const canSplit = hand.cards.length === 2
      && sameRankPair(hand.cards)
      && hands.length < 4
      && !(hand.fromSplit && rankOf(hand.cards[0]) === 12);
    const action = strategyAction(hand.cards, initialDealer[0], { canDouble, canSplit });

    if (action === "hit") {
      hand.cards.push(nextCard());
      continue;
    }

    if (action === "stand") {
      hand.status = "done";
      handIndex += 1;
      continue;
    }

    if (action === "double" && canDouble) {
      net -= hand.bet;
      hand.bet *= 2;
      hand.cards.push(nextCard());
      hand.status = handInfo(hand.cards).bust ? "bust" : "done";
      handIndex += 1;
      continue;
    }

    if (action === "split" && canSplit) {
      net -= hand.bet;
      const aceSplit = rankOf(hand.cards[0]) === 12;
      const first = {
        cards:[hand.cards[0], nextCard()],
        bet:hand.bet,
        status:aceSplit ? "done" : "active",
        fromSplit:true,
        splitAces:aceSplit
      };
      const second = {
        cards:[hand.cards[1], nextCard()],
        bet:hand.bet,
        status:aceSplit ? "done" : "active",
        fromSplit:true,
        splitAces:aceSplit
      };
      hands.splice(handIndex, 1, first, second);
      continue;
    }

    // This is only reachable if an action is unavailable after a rule limit.
    hand.cards.push(nextCard());
  }

  const dealer = [...initialDealer];
  if (!hands.every((hand) => hand.status === "bust")) {
    while (true) {
      const info = handInfo(dealer);
      if (info.total < 17 || (info.total === 17 && info.soft)) dealer.push(nextCard());
      else break;
    }
  }

  const finalDealer = handInfo(dealer);
  hands.forEach((hand) => {
    const player = handInfo(hand.cards);
    if (player.bust) return;
    if (finalDealer.bust || player.total > finalDealer.total) net += 2 * hand.bet;
    else if (player.total === finalDealer.total) net += hand.bet;
  });
  return Math.round(net * 10) / 10;
}

function outcomesFromBalanceHistory(history) {
  let wins = 0;
  let pushes = 0;
  let losses = 0;
  for (let index = 1; index < history.length; index += 1) {
    const change = Number(history[index]) - Number(history[index - 1]);
    if (change > 1e-9) wins += 1;
    else if (change < -1e-9) losses += 1;
    else pushes += 1;
  }
  return { wins, pushes, losses };
}

function newPlaySession() {
  const shoe = sixDeckShoe();
  return {
    balance:0,
    optimalBalance:0,
    balanceHistory:[0],
    optimalBalanceHistory:[0],
    completedRounds:0,
    wins:0,
    pushes:0,
    losses:0,
    scoredHands:0,
    perfectHands:0,
    mistakes:[],
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
      const balance = Number.isFinite(stored.balance) ? stored.balance : 0;
      const balanceHistory = Array.isArray(stored.balanceHistory) && stored.balanceHistory.length
        ? stored.balanceHistory.filter(Number.isFinite)
        : [balance];
      const optimalBalance = Number.isFinite(stored.optimalBalance) ? stored.optimalBalance : balance;
      const optimalBalanceHistory = Array.isArray(stored.optimalBalanceHistory) && stored.optimalBalanceHistory.length
        ? stored.optimalBalanceHistory.filter(Number.isFinite)
        : [optimalBalance];
      const completedRounds = Number.isFinite(stored.completedRounds)
        ? stored.completedRounds
        : Math.max(0, Math.min(balanceHistory.length, optimalBalanceHistory.length) - 1);
      const migratedOutcomes = outcomesFromBalanceHistory(balanceHistory);
      const hasSavedOutcomes = [stored.wins, stored.pushes, stored.losses]
        .every(value => Number.isFinite(Number(value)));
      const wins = hasSavedOutcomes ? Number(stored.wins) : migratedOutcomes.wins;
      const pushes = hasSavedOutcomes ? Number(stored.pushes) : migratedOutcomes.pushes;
      const losses = hasSavedOutcomes ? Number(stored.losses) : migratedOutcomes.losses;
      const savedScoredHandsRaw = localStorage.getItem("blackjackPlayScoredHands");
      const savedPerfectHandsRaw = localStorage.getItem("blackjackPlayPerfectHands");
      const savedScoredHands = savedScoredHandsRaw === null ? NaN : Number(savedScoredHandsRaw);
      const savedPerfectHands = savedPerfectHandsRaw === null ? NaN : Number(savedPerfectHandsRaw);
      const scoredHands = Number.isFinite(savedScoredHands)
        ? savedScoredHands
        : (Number.isFinite(stored.scoredHands) ? stored.scoredHands : 0);
      const perfectHands = Number.isFinite(savedPerfectHands)
        ? savedPerfectHands
        : (Number.isFinite(stored.perfectHands) ? stored.perfectHands : 0);
      const mistakes = Array.isArray(stored.mistakes)
        ? stored.mistakes.filter((mistake) => mistake && Number.isFinite(mistake.handNumber) && Array.isArray(mistake.player))
        : [];
      return {
        ...stored,
        balance,
        optimalBalance,
        balanceHistory:balanceHistory.length ? balanceHistory : [balance],
        optimalBalanceHistory:optimalBalanceHistory.length ? optimalBalanceHistory : [optimalBalance],
        completedRounds,
        wins,
        pushes,
        losses,
        scoredHands,
        perfectHands,
        mistakes,
        round:null,
        busy:false,
        message:""
      };
    }
  } catch (_) {}
  return newPlaySession();
}

function savePlaySession() {
  localStorage.setItem("blackjackPlaySession", JSON.stringify({
    balance:state.play.balance,
    optimalBalance:state.play.optimalBalance,
    balanceHistory:state.play.balanceHistory,
    optimalBalanceHistory:state.play.optimalBalanceHistory,
    completedRounds:state.play.completedRounds,
    wins:state.play.wins,
    pushes:state.play.pushes,
    losses:state.play.losses,
    scoredHands:state.play.scoredHands,
    perfectHands:state.play.perfectHands,
    mistakes:state.play.mistakes,
    shoe:state.play.shoe,
    shoePosition:state.play.shoePosition,
    cutPosition:state.play.cutPosition
  }));
  localStorage.setItem("blackjackPlayScoredHands", String(state.play.scoredHands));
  localStorage.setItem("blackjackPlayPerfectHands", String(state.play.perfectHands));
}

function clearPlayDecisionIndicator() {
  elements.playDecisionIndicator.textContent = "";
  elements.playDecisionIndicator.className = "play-decision-indicator";
  elements.playDecisionIndicator.setAttribute("aria-label", "");
}

function flashPlayDecisionIndicator(wasCorrect) {
  const symbol = wasCorrect ? "+" : "−";
  const resultClass = wasCorrect ? "correct" : "incorrect";
  const spokenText = wasCorrect ? "Perfectly played hand" : "Hand contained an incorrect basic-strategy decision";

  elements.playDecisionIndicator.textContent = symbol;
  elements.playDecisionIndicator.setAttribute("aria-label", spokenText);
  elements.playDecisionIndicator.className = "play-decision-indicator";
  void elements.playDecisionIndicator.offsetWidth;
  elements.playDecisionIndicator.classList.add("visible", resultClass, "pulse");
}

function recordPlayDecision(action, hand, availableActions) {
  const round = state.play.round;
  const canDouble = availableActions.includes("double");
  const canSplit = availableActions.includes("split");
  const correctAction = strategyAction(hand.cards, round.dealer[0], { canDouble, canSplit });
  const wasCorrect = action === correctAction;

  round.decisionCount = (round.decisionCount || 0) + 1;
  round.allDecisionsCorrect = round.allDecisionsCorrect !== false && wasCorrect;
  if (!wasCorrect) {
    const splitHandIndex = round.hands.indexOf(hand);
    state.play.mistakes.push({
      handNumber: round.sessionHandNumber || state.play.completedRounds + 1,
      decisionNumber: round.decisionCount,
      splitHandNumber: round.hands.length > 1 && splitHandIndex >= 0 ? splitHandIndex + 1 : null,
      dealerUp: round.dealer[0],
      player: [...hand.cards],
      chosen: action,
      correct: correctAction
    });
  }
  savePlaySession();
  return wasCorrect;
}

function reshufflePlayShoe() {
  state.play.shoe = sixDeckShoe();
  state.play.shoePosition = 0;
  state.play.cutPosition = Math.floor(TOTAL_CARDS * (0.80 + 0.10 * randomFloat()));
}

function ensureShoe() {
  if (state.play.shoePosition >= state.play.cutPosition) reshufflePlayShoe();
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

function recordCompletedRound() {
  const round = state.play.round;
  if (!round || round.historyRecorded) return;
  const actualNet = Math.round((state.play.balance - round.balanceBefore) * 10) / 10;
  const optimalNet = Number.isFinite(round.optimalNet) ? round.optimalNet : actualNet;
  state.play.balance = Math.round(state.play.balance * 10) / 10;
  state.play.optimalBalance = Math.round((state.play.optimalBalance + optimalNet) * 10) / 10;
  state.play.balanceHistory.push(state.play.balance);
  state.play.optimalBalanceHistory.push(state.play.optimalBalance);
  state.play.completedRounds += 1;
  if (actualNet > 1e-9) state.play.wins += 1;
  else if (actualNet < -1e-9) state.play.losses += 1;
  else state.play.pushes += 1;
  if ((round.decisionCount || 0) > 0 && !round.accuracyRecorded) {
    state.play.scoredHands += 1;
    if (round.allDecisionsCorrect !== false) state.play.perfectHands += 1;
    round.accuracyRecorded = true;
    flashPlayDecisionIndicator(round.allDecisionsCorrect !== false);
  }
  round.historyRecorded = true;
  savePlaySession();
}

async function dealPlayRound() {
  if (state.play.busy || (state.play.round && state.play.round.stage !== "complete")) return;
  ensureShoe();
  clearPlayDecisionIndicator();
  state.play.busy = true;
  state.play.balance -= BASE_WAGER;
  const balanceBefore = state.play.balance + BASE_WAGER;
  state.play.round = {
    stage:"dealing",
    dealer:[],
    hands:[{ cards:[], bet:BASE_WAGER, status:"active", fromSplit:false, splitAces:false, outcome:"" }],
    activeIndex:0,
    sessionHandNumber:state.play.completedRounds + 1,
    decisionCount:0,
    allDecisionsCorrect:true,
    accuracyRecorded:false,
    balanceBefore,
    optimalNet:null,
    historyRecorded:false
  };
  state.play.message = "Dealing…";
  renderPlay();

  state.play.round.hands[0].cards.push(drawCard()); renderPlay(); await sleep(150);
  state.play.round.dealer.push(drawCard()); renderPlay(); await sleep(150);
  state.play.round.hands[0].cards.push(drawCard()); renderPlay(); await sleep(150);
  state.play.round.dealer.push(drawCard()); renderPlay(); await sleep(170);

  try {
    state.play.round.optimalNet = simulateOptimalRound(
      state.play.round.hands[0].cards,
      state.play.round.dealer,
      state.play.shoe.slice(state.play.shoePosition)
    );
  } catch (error) {
    console.error("Could not simulate the optimal shadow hand.", error);
  }

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
  recordCompletedRound();
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
  const availableActions = availablePlayActions();
  if (!round || round.stage !== "player" || !hand || !availableActions.includes(action)) return;
  recordPlayDecision(action, hand, availableActions);
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
  if (aceSplit || handInfo(first.cards).total === 21) first.status = "done";
  if (aceSplit || handInfo(second.cards).total === 21) second.status = "done";
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
  recordCompletedRound();
  renderPlay();
}

function deltaLabel(value) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0";
  const number = Math.abs(rounded).toFixed(Number.isInteger(rounded) ? 0 : 1);
  return `${rounded > 0 ? "+" : "−"}${number}`;
}

function scheduleBalanceChartDraw() {
  if (balanceChartFrame) return;
  balanceChartFrame = window.requestAnimationFrame(() => {
    balanceChartFrame = 0;
    drawBalanceChart();
  });
}

function drawBalanceChart() {
  const canvas = elements.playBalanceChart;
  if (!canvas || canvas.offsetParent === null) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(280, rect.width);
  const height = Math.max(150, rect.height);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  const actualValues = state.play.balanceHistory.length ? state.play.balanceHistory : [0];
  const optimalValues = state.play.optimalBalanceHistory.length ? state.play.optimalBalanceHistory : [0];
  const signature = `${pixelWidth}x${pixelHeight}:${state.play.completedRounds}:${state.play.balance}:${state.play.optimalBalance}:${actualValues.length}:${optimalValues.length}`;
  if (signature === lastBalanceChartSignature) return;
  lastBalanceChartSignature = signature;

  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;

  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const allValues = [...actualValues, ...optimalValues];
  const pointCount = Math.max(actualValues.length, optimalValues.length);
  const minimum = Math.min(0, ...allValues);
  const maximum = Math.max(0, ...allValues);
  const spread = Math.max(4, maximum - minimum);
  const low = minimum - spread * 0.18;
  const high = maximum + spread * 0.18;
  const left = 40;
  const right = 12;
  const top = 12;
  const bottom = 12;
  const xFor = index => left + (pointCount === 1 ? 0 : index / (pointCount - 1) * (width - left - right));
  const yFor = value => top + (high - value) / (high - low || 1) * (height - top - bottom);

  context.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
  context.fillStyle = "rgba(232,226,207,.72)";
  context.strokeStyle = "rgba(232,226,207,.14)";
  for (let index = 0; index <= 4; index += 1) {
    const value = high - (high - low) * index / 4;
    const y = yFor(value);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.stroke();
    context.fillText(String(Math.round(value)), 6, y + 4);
  }

  const zeroY = yFor(0);
  context.save();
  context.strokeStyle = "rgba(231,200,106,.4)";
  context.setLineDash([5, 5]);
  context.beginPath();
  context.moveTo(left, zeroY);
  context.lineTo(width - right, zeroY);
  context.stroke();
  context.restore();

  const buildPath = values => {
    context.beginPath();
    values.forEach((value, index) => {
      if (index) context.lineTo(xFor(index), yFor(value));
      else context.moveTo(xFor(index), yFor(value));
    });
  };

  // Draw optimal first so Your play remains visible whenever the lines overlap.
  if (optimalValues.length > 1) {
    buildPath(optimalValues);
    context.strokeStyle = "#e7c86a";
    context.lineWidth = 2.25;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
  }

  if (actualValues.length > 1) {
    const drawClippedLine = (clipTop, clipBottom, color) => {
      context.save();
      context.beginPath();
      context.rect(0, clipTop, width, Math.max(0, clipBottom - clipTop));
      context.clip();
      buildPath(actualValues);
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();
      context.restore();
    };
    drawClippedLine(0, zeroY, "#4ccf79");
    drawClippedLine(zeroY, height, "#ff6b6b");
  }

  const actualLast = actualValues[actualValues.length - 1];
  const optimalLast = optimalValues[optimalValues.length - 1];
  context.fillStyle = "#e7c86a";
  context.beginPath();
  context.arc(xFor(optimalValues.length - 1), yFor(optimalLast), 3.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = actualLast >= 0 ? "#4ccf79" : "#ff6b6b";
  context.beginPath();
  context.arc(xFor(actualValues.length - 1), yFor(actualLast), 4, 0, Math.PI * 2);
  context.fill();

  canvas.setAttribute(
    "aria-label",
    `Line chart comparing your blackjack bankroll with optimal play. Current optimal-minus-you difference: ${deltaLabel(optimalLast - actualLast)}.`
  );
}

function renderPlayMistakes() {
  const mistakes = Array.isArray(state.play.mistakes) ? state.play.mistakes : [];
  elements.playMistakeCount.textContent = String(mistakes.length);
  elements.playMistakeList.replaceChildren();

  if (!mistakes.length) {
    const empty = document.createElement("p");
    empty.className = "session-mistake-empty";
    empty.textContent = "No incorrect decisions yet this session.";
    elements.playMistakeList.append(empty);
    return;
  }

  mistakes.forEach((mistake) => {
    const item = document.createElement("article");
    item.className = "session-mistake-card";

    const title = document.createElement("div");
    title.className = "session-mistake-title";
    const splitLabel = mistake.splitHandNumber ? ` · Split hand ${mistake.splitHandNumber}` : "";
    title.textContent = `Hand ${mistake.handNumber}${splitLabel} · Decision ${mistake.decisionNumber}`;

    const table = document.createElement("div");
    table.className = "missed-blackjack-table";

    const dealer = document.createElement("div");
    dealer.className = "missed-card-group";
    dealer.innerHTML = '<div class="missed-card-label">Dealer</div>';
    const dealerCards = document.createElement("div");
    dealerCards.className = "mini-review-hand";
    dealerCards.append(cardElement(mistake.dealerUp, { small:true }));
    dealerCards.append(cardElement(0, { small:true, back:true }));
    dealer.append(dealerCards);

    const player = document.createElement("div");
    player.className = "missed-card-group";
    player.innerHTML = `<div class="missed-card-label">You · ${blackjackHandDescription(mistake.player)}</div>`;
    const playerCards = document.createElement("div");
    playerCards.className = "mini-review-hand";
    mistake.player.forEach((card) => playerCards.append(cardElement(card, { small:true })));
    player.append(playerCards);
    table.append(dealer, player);

    const decisions = document.createElement("div");
    decisions.className = "missed-decision-grid";
    decisions.innerHTML = `
      <div><span>Your decision</span><strong class="incorrect-decision">${ACTION_LABELS[mistake.chosen]}</strong></div>
      <div><span>Correct decision</span><strong class="correct-decision">${ACTION_LABELS[mistake.correct]}</strong></div>`;

    item.append(title, table, decisions);
    elements.playMistakeList.append(item);
  });
}

function renderPlay() {
  const play = state.play;
  renderPlayMistakes();
  elements.playBalance.textContent = formatUnits(play.balance);
  const playAccuracy = play.scoredHands ? 100 * play.perfectHands / play.scoredHands : 0;
  elements.playAccuracy.textContent = `${playAccuracy.toFixed(1)}%`;
  elements.playAccuracy.setAttribute(
    "title",
    `${play.perfectHands} perfectly played of ${play.scoredHands} ${play.scoredHands === 1 ? "hand" : "hands"} with decisions`
  );
  elements.playBalance.classList.toggle("positive", play.balance > 0);
  elements.playBalance.classList.toggle("negative", play.balance < 0);

  const dealtPct = 100 * play.shoePosition / TOTAL_CARDS;
  const remainingPct = Math.max(0, 100 - dealtPct);
  const cutReservePct = 100 * (TOTAL_CARDS - play.cutPosition) / TOTAL_CARDS;
  elements.shoeDealt.style.height = `${Math.min(100, dealtPct)}%`;
  elements.shoeCut.style.top = `${Math.min(99, dealtPct + cutReservePct)}%`;
  elements.shoeRemaining.style.top = "auto";
  elements.shoeRemaining.style.height = `calc(${remainingPct}% - 8px)`;
  elements.shoeText.textContent = `${TOTAL_CARDS - play.shoePosition} left`;

  const actualHistoryValue = play.balanceHistory[play.balanceHistory.length - 1] ?? 0;
  const optimalHistoryValue = play.optimalBalanceHistory[play.optimalBalanceHistory.length - 1] ?? actualHistoryValue;
  const delta = Math.round((optimalHistoryValue - actualHistoryValue) * 10) / 10;
  elements.playCompletedHands.textContent = String(play.completedRounds);
  elements.playWins.textContent = String(play.wins);
  elements.playPushes.textContent = String(play.pushes);
  elements.playLosses.textContent = String(play.losses);
  elements.playDeltaSummary.textContent = `Optimal − you: ${deltaLabel(delta)}`;
  elements.playDeltaSummary.classList.toggle("ahead", delta > 0);
  elements.playDeltaSummary.classList.toggle("behind", delta < 0);
  scheduleBalanceChartDraw();

  elements.playDealer.replaceChildren();
  elements.playHands.replaceChildren();
  renderActionButtons(elements.playActions, [], () => {}, { fixedSlots:true });
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
    elements.dealerTotal.textContent = handTotalLabel(round.dealer);
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
    meta.textContent = `${round.hands.length > 1 ? `Hand ${index + 1} · ` : ""}${handTotalLabel(hand.cards)} · Bet ${formatUnits(hand.bet)}`;
    const outcome = document.createElement("div");
    outcome.className = "hand-outcome";
    outcome.textContent = hand.outcome;
    box.append(cardRow, meta, outcome);
    elements.playHands.append(box);
  });

  if (round.stage === "player") renderActionButtons(elements.playActions, availablePlayActions(), playAction, { fixedSlots:true });
  elements.playMessage.textContent = play.message;
  elements.dealButton.textContent = round.stage === "complete" ? "New Hand" : "Deal";
  elements.dealButton.disabled = play.busy || round.stage !== "complete";
}

function startChallenge() {
  state.challenge = { active:true, completedHands:0, correct:0, round:null, finished:false, misses:[] };
  elements.modeTabs.classList.add("hidden");
  elements.challengeLaunch.classList.add("hidden");
  elements.trainPanel.classList.add("hidden");
  elements.trainScore.classList.add("hidden");
  elements.lookupPanel.classList.add("hidden");
  elements.playPanel.classList.add("hidden");
  elements.challengePanel.classList.remove("hidden");
  elements.challengeGame.classList.remove("hidden");
  elements.challengeSummary.classList.add("hidden");
  elements.challengeReview.classList.add("hidden");
  newChallengeRound();
}

function newChallengeRound() {
  if (!state.challenge.active || state.challenge.finished) return;
  state.challenge.round = practiceRoundFromFreshShoe();
  renderChallenge();
}

function renderChallenge() {
  const challenge = state.challenge;
  const round = challenge.round;
  if (!round) return;

  const activeNumber = round.stage === "player" && round.hands.length > 1
    ? ` · Playing split hand ${round.activeIndex + 1} of ${round.hands.length}`
    : "";
  elements.challengeProgress.textContent = `Hands completed: ${challenge.completedHands} / 200${activeNumber}`;
  renderPracticeDealer(elements.challengeDealer, elements.challengeDealerTotal, round);
  renderPracticeHands(elements.challengeHands, round);
  renderPracticeActionArea(elements.challengeActions, round, answerChallenge);
}

async function answerChallenge(action) {
  if (!state.challenge.active || state.challenge.finished) return;
  await practiceAction("challenge", action);
}

function renderChallengeSummary() {
  const c = state.challenge;
  const percent = 100 * c.correct / 200;
  const passed = c.correct >= 196;
  const perfect = c.correct === 200;
  elements.challengeGame.classList.add("hidden");
  elements.challengeSummary.classList.remove("hidden");
  const today = new Intl.DateTimeFormat(undefined, { year:"numeric", month:"long", day:"numeric" }).format(new Date());

  let resultMarkup;
  if (perfect) {
    resultMarkup = `
      <div class="certificate grand-master">
        <div class="grand-master-rays" aria-hidden="true"></div>
        <div class="grand-master-stars" aria-hidden="true">♠ · ♦ · ♣ · ♥</div>
        <div class="certificate-small">CASA DEL JEFE · HALL OF MASTERS</div>
        <div class="certificate-title">BLACKJACK<br>GRAND MASTER</div>
        <div class="certificate-rule"></div>
        <p>This certifies a flawless performance in the 200-hand El Jefe Blackjack Challenge.</p>
        <div class="certificate-score">200 / 200 · 100%</div>
        <div class="grand-master-crest" aria-hidden="true">♛</div>
        <div class="grand-master-subtitle">Perfect Strategy</div>
        <p>Certified by El Jefe</p>
        <p>${today}</p>
        <div class="certificate-share">Screenshot this Grand Master certificate and send it to the group text thread.</div>
      </div>`;
  } else if (passed) {
    resultMarkup = `
      <div class="certificate">
        <div class="certificate-small">CERTIFICATE OF BLACKJACK READINESS</div>
        <div class="certificate-title">EL JEFE APPROVED</div>
        <div class="certificate-rule"></div>
        <p>This certifies that the bearer completed the 200-hand El Jefe Blackjack Challenge with:</p>
        <div class="certificate-score">${c.correct} / 200 · ${percent.toFixed(1)}%</div>
        <p>You are now approved to play blackjack at Casa del Jefe.</p>
        <p>${today}</p>
        <div class="certificate-share">Screenshot this certificate and send it to the group text thread.</div>
      </div>`;
  } else {
    resultMarkup = `
      <div class="challenge-fail">
        <h2>Not quite El Jefe approved</h2>
        <div class="challenge-final-score">${c.correct} / 200 · ${percent.toFixed(1)}%</div>
        <p>You are not quite ready to put money on a blackjack table. Practice the weak spots and try the challenge again.</p>
      </div>`;
  }

  elements.challengeSummary.innerHTML = `${resultMarkup}
    <button class="challenge-review-link" id="challengeReviewLink" type="button">See missed hands (${c.misses.length})</button>
    <div class="challenge-summary-actions">
      <button class="primary" id="challengeAgain">Try Again</button>
      <button id="challengeDone">Done</button>
    </div>`;
  $("#challengeAgain").addEventListener("click", startChallenge);
  $("#challengeDone").addEventListener("click", exitChallenge);
  $("#challengeReviewLink").addEventListener("click", showChallengeReview);
}

function blackjackHandDescription(cards) {
  if (sameRankPair(cards)) return `Pair of ${RANKS[rankOf(cards[0])]}s`;
  return handTotalLabel(cards);
}

function renderChallengeReview() {
  const c = state.challenge;
  elements.challengeReview.replaceChildren();

  const headingRow = document.createElement("div");
  headingRow.className = "challenge-review-heading";
  const headingText = document.createElement("div");
  headingText.innerHTML = `<div class="challenge-kicker">EL JEFE CHALLENGE</div><h2>Missed hands</h2>`;
  const back = document.createElement("button");
  back.type = "button";
  back.className = "challenge-exit";
  back.textContent = "Back to results";
  back.addEventListener("click", () => {
    elements.challengeReview.classList.add("hidden");
    elements.challengeSummary.classList.remove("hidden");
  });
  headingRow.append(headingText, back);
  elements.challengeReview.append(headingRow);

  const intro = document.createElement("p");
  intro.className = "challenge-review-intro";
  intro.textContent = c.misses.length
    ? `${c.misses.length} hand${c.misses.length === 1 ? "" : "s"} contained at least one incorrect decision.`
    : "Perfect challenge. There were no missed hands.";
  elements.challengeReview.append(intro);

  if (!c.misses.length) return;

  const list = document.createElement("div");
  list.className = "missed-hand-list";

  c.misses.forEach((miss) => {
    const item = document.createElement("article");
    item.className = "missed-hand-card";

    const number = document.createElement("div");
    number.className = "missed-hand-number";
    number.textContent = `Hand ${miss.handNumber}`;

    const table = document.createElement("div");
    table.className = "missed-blackjack-table";

    const dealer = document.createElement("div");
    dealer.className = "missed-card-group";
    dealer.innerHTML = '<div class="missed-card-label">Dealer</div>';
    const dealerCards = document.createElement("div");
    dealerCards.className = "mini-review-hand";
    dealerCards.append(cardElement(miss.dealerUp, { small:true }));
    dealerCards.append(cardElement(0, { small:true, back:true }));
    dealer.append(dealerCards);

    const player = document.createElement("div");
    player.className = "missed-card-group";
    player.innerHTML = `<div class="missed-card-label">You · ${blackjackHandDescription(miss.player)}</div>`;
    const playerCards = document.createElement("div");
    playerCards.className = "mini-review-hand";
    miss.player.forEach((card) => playerCards.append(cardElement(card, { small:true })));
    player.append(playerCards);

    table.append(dealer, player);

    const decisions = document.createElement("div");
    decisions.className = "missed-decision-list";
    const mistakes = Array.isArray(miss.mistakes) ? miss.mistakes : [];
    mistakes.forEach((mistake, index) => {
      const row = document.createElement("div");
      row.className = "missed-decision-entry";
      const context = document.createElement("div");
      context.className = "missed-decision-context";
      context.textContent = `Decision ${index + 1} · ${blackjackHandDescription(mistake.player)}`;
      const grid = document.createElement("div");
      grid.className = "missed-decision-grid";
      grid.innerHTML = `
        <div><span>Your decision</span><strong class="incorrect-decision">${ACTION_LABELS[mistake.chosen]}</strong></div>
        <div><span>Correct decision</span><strong class="correct-decision">${ACTION_LABELS[mistake.correct]}</strong></div>`;
      row.append(context, grid);
      decisions.append(row);
    });

    item.append(number, table, decisions);
    list.append(item);
  });

  elements.challengeReview.append(list);
}

function showChallengeReview() {
  elements.challengeSummary.classList.add("hidden");
  elements.challengeReview.classList.remove("hidden");
  renderChallengeReview();
  elements.challengeReview.scrollIntoView({ block:"start" });
}

function exitChallenge() {
  state.challenge.active = false;
  elements.challengePanel.classList.add("hidden");
  elements.challengeReview.classList.add("hidden");
  elements.modeTabs.classList.remove("hidden");
  elements.challengeLaunch.classList.remove("hidden");
  switchMode(state.mode);
}

elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode)));
elements.trainNext.addEventListener("click", newTrainHand);
elements.trainFocusedHands.addEventListener("change", () => {
  state.train.focusedHands = elements.trainFocusedHands.checked;
  localStorage.setItem("blackjackTrainFocusedHands", String(state.train.focusedHands));
  newTrainHand();
});
elements.resetTrainScore.addEventListener("click", () => {
  state.train.attempts = 0;
  state.train.correct = 0;
  localStorage.setItem("blackjackTrainAttempts", "0");
  localStorage.setItem("blackjackTrainCorrect", "0");
  renderTrain();
});
elements.lookupDealerTarget.addEventListener("click", () => {
  state.lookup.target = "dealer";
  renderLookup();
});
elements.lookupPlayerTarget.addEventListener("click", () => {
  state.lookup.target = "player";
  renderLookup();
});
elements.lookupClear.addEventListener("click", () => {
  state.lookup = { dealer:null, player:[], target:"dealer" };
  renderLookup();
});
elements.dealButton.addEventListener("click", dealPlayRound);
elements.resetPlay.addEventListener("click", () => {
  if (!confirm("Reset the balance, graph, incorrect-decision history, and six-deck shoe?")) return;
  state.play = newPlaySession();
  clearPlayDecisionIndicator();
  savePlaySession();
  renderPlay();
});
elements.challengeLaunch.addEventListener("click", startChallenge);
elements.challengeExit.addEventListener("click", exitChallenge);

function isTypingTarget(target) {
  return target instanceof HTMLElement && (
    target.matches("input, textarea, select") || target.isContentEditable
  );
}

function clickAvailableAction(container, action) {
  const button = container?.querySelector(`button[data-action="${action}"]`);
  if (!button || button.disabled || button.classList.contains("action-unavailable")) return false;
  button.click();
  return true;
}

function handleKeyboardShortcut(event) {
  if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  if (isTypingTarget(event.target)) return;

  const action = ({ h:"hit", s:"stand", d:"double", p:"split" })[event.key.toLowerCase()];
  if (action) {
    const container = state.challenge.active
      ? elements.challengeActions
      : state.mode === "play"
        ? elements.playActions
        : state.mode === "train"
          ? elements.trainActions
          : null;

    if (container && clickAvailableAction(container, action)) {
      event.preventDefault();
    }
    return;
  }

  if (event.key !== "Enter" || state.challenge.active) return;

  if (state.mode === "play" && !elements.dealButton.disabled) {
    event.preventDefault();
    elements.dealButton.click();
  } else if (state.mode === "train" && !elements.trainNext.disabled) {
    event.preventDefault();
    elements.trainNext.click();
  }
}

window.addEventListener("keydown", handleKeyboardShortcut);
if ("ResizeObserver" in window) {
  const chartObserver = new ResizeObserver(() => {
    if (state.mode === "play") scheduleBalanceChartDraw();
  });
  chartObserver.observe(elements.playBalanceChart);
} else {
  window.addEventListener("resize", () => {
    if (state.mode === "play") scheduleBalanceChartDraw();
  }, { passive:true });
}

renderStrategyTables();
newTrainHand();
renderLookup();
switchMode("play");

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let waitingWorker = null;
  let waitingRegistration = null;
  let reloadingForUpdate = false;

  const hideUpdateNotice = () => {
    waitingWorker = null;
    waitingRegistration = null;
    if (elements.updateNotice) elements.updateNotice.classList.add("hidden");
    if (elements.reloadUpdate) {
      elements.reloadUpdate.disabled = false;
      elements.reloadUpdate.textContent = "Reload Now";
    }
  };

  const workerVersion = worker => new Promise(resolve => {
    if (!worker) {
      resolve(null);
      return;
    }
    const channel = new MessageChannel();
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value ? String(value) : null);
    };
    const timer = window.setTimeout(() => finish(null), 1200);
    channel.port1.onmessage = event => finish(event.data && event.data.version);
    try {
      worker.postMessage({ type:"GET_VERSION" }, [channel.port2]);
    } catch {
      finish(null);
    }
  });

  const numericVersion = value => {
    const parsed = Number.parseInt(String(value || "").replace(/\D+/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const considerWaitingWorker = async (registration, worker) => {
    if (!worker || worker.state !== "installed") return;
    const version = await workerVersion(worker);
    const pageVersion = numericVersion(APP_VERSION);
    const candidateVersion = numericVersion(version);

    if (candidateVersion === pageVersion) {
      hideUpdateNotice();
      worker.postMessage({ type:"SKIP_WAITING" });
      return;
    }

    if (candidateVersion === null || (pageVersion !== null && candidateVersion < pageVersion)) {
      hideUpdateNotice();
      return;
    }

    if (!navigator.serviceWorker.controller || !elements.updateNotice) return;
    waitingWorker = worker;
    waitingRegistration = registration;
    elements.updateNotice.classList.remove("hidden");
  };

  const watchedWorkers = new WeakSet();
  const watchWorker = (registration, worker) => {
    if (!worker || watchedWorkers.has(worker)) return;
    watchedWorkers.add(worker);
    const checkState = () => {
      if (worker.state === "installed") considerWaitingWorker(registration, registration.waiting || worker);
    };
    worker.addEventListener("statechange", checkState);
    checkState();
  };

  const watchRegistration = registration => {
    if (registration.waiting) considerWaitingWorker(registration, registration.waiting);
    watchWorker(registration, registration.installing);
    registration.addEventListener("updatefound", () => watchWorker(registration, registration.installing));
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register(`./service-worker.js?v=${APP_VERSION}`, { updateViaCache:"none" });
      watchRegistration(registration);
      registration.update().catch(() => {});
    } catch (error) {
      console.warn("Could not register the Blackjack service worker.", error);
    }
  };

  if (elements.reloadUpdate) {
    elements.reloadUpdate.addEventListener("click", () => {
      const worker = (waitingRegistration && waitingRegistration.waiting) || waitingWorker;
      elements.reloadUpdate.disabled = true;
      elements.reloadUpdate.textContent = "Reloading…";

      if (!worker) {
        window.location.reload();
        return;
      }

      const reloadOnce = () => {
        if (reloadingForUpdate) return;
        reloadingForUpdate = true;
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, { once:true });
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") reloadOnce();
      });

      try {
        worker.postMessage({ type:"SKIP_WAITING" });
      } catch {
        reloadOnce();
        return;
      }
      window.setTimeout(reloadOnce, 2500);
    });
  }

  window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(registerServiceWorker, { timeout:2500 });
    else window.setTimeout(registerServiceWorker, 750);
  }, { once:true });
}

