"use strict";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["\u2665", "\u2666", "\u2663", "\u2660"];
const WAGER = 5;
const CHALLENGE_HANDS = 200;
const CHALLENGE_PASSING_SCORE = 190;

const PAYTABLE = {
  "Royal Flush": 4000,
  "Straight Flush": 250,
  "Four of a Kind": 125,
  "Full House": 45,
  "Flush": 30,
  "Straight": 20,
  "Three of a Kind": 15,
  "Two Pair": 10,
  "Jacks or Better": 5
};

const el = {
  status: document.querySelector("#status"),
  paytableDetails: document.querySelector("#paytableDetails"),
  trainTab: document.querySelector("#trainTab"),
  lookupTab: document.querySelector("#lookupTab"),
  playTab: document.querySelector("#playTab"),
  modeTabs: document.querySelector("#modeTabs"),
  challengeLaunchWrap: document.querySelector("#challengeLaunchWrap"),
  challengeLaunch: document.querySelector("#challengeLaunch"),
  trainPanel: document.querySelector("#trainPanel"),
  lookupPanel: document.querySelector("#lookupPanel"),
  playPanel: document.querySelector("#playPanel"),
  challengePanel: document.querySelector("#challengePanel"),
  challengeActive: document.querySelector("#challengeActive"),
  challengeSummary: document.querySelector("#challengeSummary"),
  challengeReview: document.querySelector("#challengeReview"),
  challengeProgress: document.querySelector("#challengeProgress"),
  challengeMadeHand: document.querySelector("#challengeMadeHand"),
  challengeHand: document.querySelector("#challengeHand"),
  challengeSelection: document.querySelector("#challengeSelection"),
  challengeSubmit: document.querySelector("#challengeSubmit"),
  exitChallenge: document.querySelector("#exitChallenge"),
  scorePanel: document.querySelector("#scorePanel"),
  trainMadeHand: document.querySelector("#trainMadeHand"),
  hand: document.querySelector("#hand"),
  selection: document.querySelector("#selection"),
  check: document.querySelector("#check"),
  newHand: document.querySelector("#newHand"),
  feedback: document.querySelector("#feedback"),
  score: document.querySelector("#score"),
  percentage: document.querySelector("#percentage"),
  reset: document.querySelector("#reset"),
  lookupHand: document.querySelector("#lookupHand"),
  lookupPrompt: document.querySelector("#lookupPrompt"),
  rankPicker: document.querySelector("#rankPicker"),
  suitPicker: document.querySelector("#suitPicker"),
  findHold: document.querySelector("#findHold"),
  clearLookup: document.querySelector("#clearLookup"),
  importFromPlay: document.querySelector("#importFromPlay"),
  lookupFeedback: document.querySelector("#lookupFeedback"),
  playBalance: document.querySelector("#playBalance"),
  playAccuracy: document.querySelector("#playAccuracy"),
  playDecisionIndicator: document.querySelector("#playDecisionIndicator"),
  playBalanceChart: document.querySelector("#playBalanceChart"),
  playChartSummary: document.querySelector("#playChartSummary"),
  playDeltaSummary: document.querySelector("#playDeltaSummary"),
  playMadeHand: document.querySelector("#playMadeHand"),
  playHand: document.querySelector("#playHand"),
  playSelection: document.querySelector("#playSelection"),
  playAction: document.querySelector("#playAction"),
  resetBalance: document.querySelector("#resetBalance"),
  playMissedDetails: document.querySelector("#playMissedDetails"),
  playMissedCount: document.querySelector("#playMissedCount"),
  playMissedList: document.querySelector("#playMissedList"),
  playFeedback: document.querySelector("#playFeedback"),
  updateNotice: document.querySelector("#updateNotice"),
  reloadUpdate: document.querySelector("#reloadUpdate")
};

let balanceChartFrame = 0;
let lastBalanceChartSignature = "";

const state = {
  strategy: null,
  mode: "play",

  hand: [],
  selected: new Set(),
  answered: false,
  attempts: Number(localStorage.getItem("jacksAttempts") || 0),
  correct: Number(localStorage.getItem("jacksCorrect") || 0),

  lookupHand: [],
  pendingRank: null,
  lookupResults: [],

  playBalance: Number(localStorage.getItem("jacksPlayBalance") || 0),
  playAttempts: Number(localStorage.getItem("jacksPlayAttempts") || 0),
  playCorrect: Number(localStorage.getItem("jacksPlayCorrect") || 0),
  playBalanceHistory: (() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jacksPlayBalanceHistory") || "null");
      if (Array.isArray(saved) && saved.length && saved.every(Number.isFinite)) return saved;
    } catch (error) {
      console.warn("Could not read saved Play balance history.", error);
    }
    const balance = Number(localStorage.getItem("jacksPlayBalance") || 0);
    return balance === 0 ? [0] : [0, balance];
  })(),
  playOptimalBalance: (() => {
    const saved = localStorage.getItem("jacksPlayOptimalBalance");
    return saved === null
      ? Number(localStorage.getItem("jacksPlayBalance") || 0)
      : Number(saved);
  })(),
  playOptimalBalanceHistory: (() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jacksPlayOptimalBalanceHistory") || "null");
      if (Array.isArray(saved) && saved.length && saved.every(Number.isFinite)) return saved;
    } catch (error) {
      console.warn("Could not read saved optimal-play history.", error);
    }

    // When upgrading an existing session, begin the shadow line at the current actual history.
    try {
      const actual = JSON.parse(localStorage.getItem("jacksPlayBalanceHistory") || "null");
      if (Array.isArray(actual) && actual.length && actual.every(Number.isFinite)) return [...actual];
    } catch (error) {
      console.warn("Could not migrate the prior Play history.", error);
    }

    const balance = Number(localStorage.getItem("jacksPlayBalance") || 0);
    return balance === 0 ? [0] : [0, balance];
  })(),
  playPhase: "idle",
  playHand: [],
  playDeck: [],
  playHeld: new Set(),
  playHiddenPositions: new Set(),
  playMisses: (() => {
    try {
      const saved = JSON.parse(localStorage.getItem("jacksPlayMisses") || "[]");
      if (Array.isArray(saved)) return saved;
    } catch (error) {
      console.warn("Could not read saved Play missed hands.", error);
    }
    return [];
  })(),

  challengePreviousMode: "play",
  challengeHand: [],
  challengeSelected: new Set(),
  challengeCompleted: 0,
  challengeCorrect: 0,
  challengeFinished: false,
  challengeMisses: []
};

const rank = card => (card - 1) % 13;
const suit = card => Math.floor((card - 1) / 13);
const label = card => RANKS[rank(card)] + SUITS[suit(card)];
const suitClass = card => ["hearts", "diamonds", "clubs", "spades"][suit(card)];

function deck() {
  const cards = Array.from({ length: 52 }, (_, index) => index + 1);
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const j = random[0] % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function evaluateHand(hand) {
  if (hand.length !== 5) return { name: "", payout: 0 };

  const ranks = hand.map(rank).sort((a, b) => a - b);
  const suits = hand.map(suit);
  const rankCounts = new Map();

  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  }

  const counts = [...rankCounts.values()].sort((a, b) => b - a);
  const uniqueRanks = [...rankCounts.keys()].sort((a, b) => a - b);
  const flush = suits.every(s => s === suits[0]);
  const wheel = uniqueRanks.join(",") === "0,1,2,3,12";
  const ordinaryStraight = uniqueRanks.length === 5 && uniqueRanks[4] - uniqueRanks[0] === 4;
  const straight = wheel || ordinaryStraight;
  const royal = flush && uniqueRanks.join(",") === "8,9,10,11,12";

  let name = "";

  if (royal) name = "Royal Flush";
  else if (straight && flush) name = "Straight Flush";
  else if (counts[0] === 4) name = "Four of a Kind";
  else if (counts[0] === 3 && counts[1] === 2) name = "Full House";
  else if (flush) name = "Flush";
  else if (straight) name = "Straight";
  else if (counts[0] === 3) name = "Three of a Kind";
  else if (counts[0] === 2 && counts[1] === 2) name = "Two Pair";
  else if (counts[0] === 2) {
    const pairRank = [...rankCounts.entries()].find(([, count]) => count === 2)?.[0];
    name = pairRank >= 9 ? "Jacks or Better" : "Small Pair";
  }

  return { name, payout: PAYTABLE[name] || 0 };
}

function setMadeHand(element, hand) {
  const result = evaluateHand(hand);
  element.textContent = result.name;
  element.classList.toggle("visible", Boolean(result.name));
  element.classList.toggle("small-pair", result.name === "Small Pair");
}

function deal() {
  state.hand = deck().slice(0, 5).sort((a, b) => a - b);
  state.selected.clear();
  state.answered = false;
  feedback("", "");
  renderTraining();
}

function toggle(card) {
  if (state.answered) return;
  state.selected.has(card) ? state.selected.delete(card) : state.selected.add(card);
  renderTraining();
}

function cardButton(card, { selected = false, disabled = false, onClick = null, placeholder = false, cardBack = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card" +
    (placeholder ? " placeholder" : "") +
    (cardBack ? " card-back" : "") +
    (!placeholder && !cardBack ? ` suit-${suitClass(card)}` : "") +
    (selected ? " selected" : "");
  button.disabled = disabled || placeholder || cardBack;

  if (placeholder) {
    button.textContent = "+";
  } else if (cardBack) {
    button.setAttribute("aria-label", "Drawing card");
  } else {
    const topSuit = document.createElement("span");
    topSuit.className = "card-suit card-suit-top";
    topSuit.textContent = SUITS[suit(card)];

    const rankText = document.createElement("span");
    rankText.className = "card-rank";
    rankText.textContent = RANKS[rank(card)];

    const bottomSuit = document.createElement("span");
    bottomSuit.className = "card-suit card-suit-bottom";
    bottomSuit.textContent = SUITS[suit(card)];

    button.append(topSuit, rankText, bottomSuit);
    button.setAttribute("aria-label", label(card));
    button.setAttribute("aria-pressed", String(selected));
    if (onClick) button.onclick = onClick;
  }

  return button;
}

function renderTraining() {
  el.hand.replaceChildren();
  for (const card of state.hand) {
    el.hand.append(cardButton(card, {
      selected: state.selected.has(card),
      disabled: state.answered,
      onClick: () => toggle(card)
    }));
  }

  setMadeHand(el.trainMadeHand, state.hand);

  const kept = state.hand.filter(card => state.selected.has(card));
  el.selection.textContent = kept.length ? "Keep: " + kept.map(label).join(" ") : "Discard all five cards";

  const percentage = state.attempts ? 100 * state.correct / state.attempts : 0;
  el.score.textContent = `${state.correct} / ${state.attempts}`;
  el.percentage.textContent = percentage.toFixed(1) + "%";
  el.check.disabled = !state.strategy || state.answered;
}

function saveTrainingScore() {
  localStorage.setItem("jacksAttempts", state.attempts);
  localStorage.setItem("jacksCorrect", state.correct);
}

function savePlaySession() {
  localStorage.setItem("jacksPlayBalance", state.playBalance);
  localStorage.setItem("jacksPlayAttempts", state.playAttempts);
  localStorage.setItem("jacksPlayCorrect", state.playCorrect);
  localStorage.setItem("jacksPlayBalanceHistory", JSON.stringify(state.playBalanceHistory));
  localStorage.setItem("jacksPlayOptimalBalance", state.playOptimalBalance);
  localStorage.setItem("jacksPlayOptimalBalanceHistory", JSON.stringify(state.playOptimalBalanceHistory));
  localStorage.setItem("jacksPlayMisses", JSON.stringify(state.playMisses));
}

function status(message, type = "") {
  el.status.textContent = message;
  el.status.className = "status" + (type ? " " + type : "") + (message ? "" : " hidden");
}

function feedback(message, type) {
  el.feedback.textContent = message;
  el.feedback.className = "feedback" + (type ? " " + type : "");
}

function playFeedback(message, type = "") {
  el.playFeedback.textContent = message;
  el.playFeedback.className = "feedback" + (type ? " " + type : "");
}

function clearPlayDecisionIndicator() {
  el.playDecisionIndicator.textContent = "";
  el.playDecisionIndicator.className = "play-decision-indicator";
  el.playDecisionIndicator.setAttribute("aria-label", "");
}

function flashPlayDecisionIndicator(wasCorrect) {
  const symbol = wasCorrect ? "+" : "−";
  const resultClass = wasCorrect ? "correct" : "incorrect";
  const spokenText = wasCorrect ? "Optimal hold" : "Non-optimal hold";

  el.playDecisionIndicator.textContent = symbol;
  el.playDecisionIndicator.setAttribute("aria-label", spokenText);

  // Remove the animation classes first so repeated identical results pulse again.
  el.playDecisionIndicator.className = "play-decision-indicator";
  void el.playDecisionIndicator.offsetWidth;
  el.playDecisionIndicator.classList.add("visible", resultClass, "pulse");
}

function canonicalize(hand) {
  const rows = Array.from({ length: 4 }, () => Array(13).fill(0));
  for (const card of hand) rows[suit(card)][rank(card)] = 1;

  const ordered = rows
    .map((row, originalSuit) => ({ row, originalSuit }))
    .sort((left, right) => {
      for (let r = 0; r < 13; r += 1) {
        if (left.row[r] !== right.row[r]) return left.row[r] - right.row[r];
      }
      return left.originalSuit - right.originalSuit;
    });

  const canonical = [];
  const original = [];

  ordered.forEach(({ row, originalSuit }, canonicalSuit) => {
    row.forEach((present, r) => {
      if (present) {
        canonical.push(r + 1 + 13 * canonicalSuit);
        original.push(r + 1 + 13 * originalSuit);
      }
    });
  });

  let key = 0;
  for (const card of canonical) key = 53 * key + card;
  return { key: String(key), original };
}

function fromMask(mask, cards) {
  const set = new Set();
  for (let i = 0; i < 5; i += 1) {
    if (mask & (1 << (4 - i))) set.add(cards[i]);
  }
  return set;
}

function optimal(hand) {
  const canonical = canonicalize(hand);
  const masks = state.strategy[canonical.key];
  if (!Array.isArray(masks)) throw new Error(`Missing key ${canonical.key} for ${hand}`);
  return masks.map(mask => fromMask(Number(mask), canonical.original));
}

function equal(left, right) {
  if (left.size !== right.size) return false;
  for (const item of left) if (!right.has(item)) return false;
  return true;
}

function describeForHand(set, hand) {
  const cards = hand.filter(card => set.has(card));
  return cards.length ? cards.map(label).join(" ") : "discard all five cards";
}

function check() {
  try {
    const holds = optimal(state.hand);
    const correct = holds.some(hold => equal(hold, state.selected));
    state.attempts += 1;
    state.answered = true;

    if (correct) {
      state.correct += 1;
      feedback("Correct!", "correct");
    } else {
      const descriptions = [...new Set(holds.map(hold => describeForHand(hold, state.hand)))];
      feedback((descriptions.length === 1 ? "Optimal play: " : "Optimal plays: ") + descriptions.join(" or "), "incorrect");
    }

    saveTrainingScore();
    renderTraining();
  } catch (error) {
    console.error(error);
    feedback("Strategy lookup failed for this hand. See the browser console.", "error");
  }
}

function setMode(mode) {
  state.mode = mode;

  const regularModes = ["train", "lookup", "play"];
  const tabs = { train: el.trainTab, lookup: el.lookupTab, play: el.playTab };
  const panels = { train: el.trainPanel, lookup: el.lookupPanel, play: el.playPanel };
  const inChallenge = mode === "challenge";

  for (const name of regularModes) {
    const active = name === mode;
    tabs[name].classList.toggle("active", active);
    tabs[name].setAttribute("aria-selected", String(active));
    panels[name].classList.toggle("hidden", !active);
  }

  el.challengePanel.classList.toggle("hidden", !inChallenge);
  el.modeTabs.classList.toggle("hidden", inChallenge);
  el.challengeLaunchWrap.classList.toggle("hidden", inChallenge);

  if (mode === "lookup") renderLookup();
  if (mode === "play") renderPlay();
  if (mode === "challenge") renderChallenge();
}


function dealChallengeHand() {
  state.challengeHand = deck().slice(0, 5).sort((a, b) => a - b);
  state.challengeSelected.clear();
}

function startChallenge() {
  if (!state.strategy) return;

  state.challengePreviousMode = state.mode === "challenge" ? "train" : state.mode;
  state.challengeCompleted = 0;
  state.challengeCorrect = 0;
  state.challengeFinished = false;
  state.challengeMisses = [];
  el.challengeReview.classList.add("hidden");
  dealChallengeHand();
  setMode("challenge");
}

function toggleChallengeCard(card) {
  if (state.challengeFinished) return;
  state.challengeSelected.has(card)
    ? state.challengeSelected.delete(card)
    : state.challengeSelected.add(card);
  renderChallenge();
}

function submitChallengeHold() {
  if (!state.strategy || state.challengeFinished) return;

  try {
    const holds = optimal(state.challengeHand);
    const wasCorrect = holds.some(hold => equal(hold, state.challengeSelected));
    if (wasCorrect) {
      state.challengeCorrect += 1;
    } else {
      state.challengeMisses.push({
        handNumber: state.challengeCompleted + 1,
        hand: [...state.challengeHand],
        userHold: [...state.challengeSelected].sort((a, b) => a - b),
        optimalHolds: holds.map(hold => [...hold].sort((a, b) => a - b))
      });
    }

    state.challengeCompleted += 1;

    if (state.challengeCompleted >= CHALLENGE_HANDS) {
      state.challengeFinished = true;
    } else {
      dealChallengeHand();
    }

    renderChallenge();
  } catch (error) {
    console.error(error);
    window.alert("The strategy lookup failed for this hand. See the browser console.");
  }
}

function leaveChallenge() {
  if (!state.challengeFinished && state.challengeCompleted > 0) {
    const leave = window.confirm(
      `Exit the challenge? Your progress through ${state.challengeCompleted} hands will be lost.`
    );
    if (!leave) return;
  }

  const destination = state.challengePreviousMode || "train";
  state.challengeFinished = false;
  state.challengeHand = [];
  state.challengeSelected.clear();
  el.challengeReview.classList.add("hidden");
  setMode(destination);
}

function renderChallengeCertificate() {
  const score = state.challengeCorrect;
  const misses = CHALLENGE_HANDS - score;
  const percentage = 100 * score / CHALLENGE_HANDS;
  const passed = score >= CHALLENGE_PASSING_SCORE;
  const date = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  el.challengeSummary.replaceChildren();

  if (passed) {
    const perfect = score === CHALLENGE_HANDS;
    const certificate = document.createElement("div");
    certificate.className = "certificate" + (perfect ? " grand-master" : "");
    certificate.innerHTML = perfect ? `
      <div class="grand-master-rays" aria-hidden="true"></div>
      <div class="grand-master-stars" aria-hidden="true">♠ · ♦ · ♣ · ♥</div>
      <div class="certificate-small">CASA DEL JEFE · HALL OF MASTERS</div>
      <div class="certificate-title">JACKS OR BETTER<br>GRAND MASTER</div>
      <div class="certificate-rule"></div>
      <p>This certifies a flawless performance in the ${CHALLENGE_HANDS}-hand El Jefe Jacks or Better Challenge.</p>
      <div class="certificate-score">${CHALLENGE_HANDS} / ${CHALLENGE_HANDS} · 100%</div>
      <div class="grand-master-crest" aria-hidden="true">♛</div>
      <div class="grand-master-subtitle">Perfect Strategy</div>
      <p>Certified by El Jefe</p>
      <p>${date}</p>
      <div class="certificate-share">Screenshot this Grand Master certificate and send it to the group text thread.</div>
    ` : `
      <div class="certificate-corner top-left">♠</div>
      <div class="certificate-corner top-right red">♥</div>
      <div class="certificate-corner bottom-left red">♦</div>
      <div class="certificate-corner bottom-right">♣</div>
      <div class="certificate-small">CERTIFICATE OF VIDEO POKER READINESS</div>
      <div class="certificate-title">EL JEFE APPROVED</div>
      <div class="certificate-rule"></div>
      <p>This certifies that the holder successfully completed the<br>
      <strong>200-Hand El Jefe Challenge</strong></p>
      <div class="certificate-score">${score} / ${CHALLENGE_HANDS} &nbsp;·&nbsp; ${percentage.toFixed(1)}%</div>
      <p class="certificate-declaration">You are now approved to play<br>
      <strong>Jacks or Better in Las Vegas.</strong></p>
      <div class="certificate-date">Issued ${date}</div>
      <div class="certificate-signature">El Jefe</div>
      <div class="certificate-signature-label">Official Video Poker Authority</div>
      <div class="certificate-share">Take a screenshot and send it to the group text thread.</div>
    `;
    el.challengeSummary.append(certificate);
  } else {
    const result = document.createElement("div");
    result.className = "challenge-fail";
    result.innerHTML = `
      <div class="challenge-fail-icon">♠</div>
      <h2>Not Quite El Jefe Approved</h2>
      <div class="challenge-final-score">${score} / ${CHALLENGE_HANDS} &nbsp;·&nbsp; ${percentage.toFixed(1)}%</div>
      <p>You missed ${misses} hands. A passing score is 190 out of 200.</p>
      <p><strong>You are not quite ready to put money into a Jacks or Better machine.</strong></p>
      <p>Spend a little more time in Train mode, then try the challenge again.</p>
    `;
    el.challengeSummary.append(result);
  }

  const reviewLink = document.createElement("button");
  reviewLink.type = "button";
  reviewLink.className = "challenge-review-link";
  reviewLink.textContent = `See missed hands (${state.challengeMisses.length})`;
  reviewLink.onclick = showChallengeReview;
  el.challengeSummary.append(reviewLink);

  const buttons = document.createElement("div");
  buttons.className = "challenge-summary-actions";

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "primary";
  retry.textContent = "Try Again";
  retry.onclick = startChallenge;

  const returnButton = document.createElement("button");
  returnButton.type = "button";
  returnButton.textContent = "Return to Trainer";
  returnButton.onclick = () => {
    state.challengePreviousMode = "train";
    leaveChallenge();
  };

  buttons.append(retry, returnButton);
  el.challengeSummary.append(buttons);
}

function describeStoredHold(cards) {
  return cards.length ? cards.map(label).join(" ") : "Discard all five cards";
}

function renderChallengeReview() {
  el.challengeReview.replaceChildren();

  const headingRow = document.createElement("div");
  headingRow.className = "challenge-review-heading";
  const headingText = document.createElement("div");
  headingText.innerHTML = `<div class="challenge-kicker">EL JEFE CHALLENGE</div><h2>Missed hands</h2>`;
  const back = document.createElement("button");
  back.type = "button";
  back.className = "challenge-exit";
  back.textContent = "Back to results";
  back.onclick = () => {
    el.challengeReview.classList.add("hidden");
    el.challengeSummary.classList.remove("hidden");
  };
  headingRow.append(headingText, back);
  el.challengeReview.append(headingRow);

  const intro = document.createElement("p");
  intro.className = "challenge-review-intro";
  intro.textContent = state.challengeMisses.length
    ? `${state.challengeMisses.length} hand${state.challengeMisses.length === 1 ? "" : "s"} to review.`
    : "Perfect challenge. There were no missed hands.";
  el.challengeReview.append(intro);

  if (!state.challengeMisses.length) return;

  const list = document.createElement("div");
  list.className = "missed-hand-list";

  state.challengeMisses.forEach((miss) => {
    const item = document.createElement("article");
    item.className = "missed-hand-card";

    const number = document.createElement("div");
    number.className = "missed-hand-number";
    number.textContent = `Hand ${miss.handNumber}`;

    const hand = document.createElement("div");
    hand.className = "mini-hand challenge-review-hand";
    miss.hand.forEach(card => hand.append(miniCard(card)));

    const decisions = document.createElement("div");
    decisions.className = "missed-hold-grid";

    const yourDecision = document.createElement("div");
    yourDecision.className = "missed-hold-row";
    yourDecision.innerHTML = '<span>Your hold</span>';
    const yourValue = document.createElement("strong");
    yourValue.className = "incorrect-decision";
    yourValue.textContent = describeStoredHold(miss.userHold);
    yourDecision.append(yourValue);

    const correctDecision = document.createElement("div");
    correctDecision.className = "missed-hold-row";
    correctDecision.innerHTML = `<span>${miss.optimalHolds.length > 1 ? "Correct holds" : "Correct hold"}</span>`;
    const correctValue = document.createElement("strong");
    correctValue.className = "correct-decision";
    correctValue.textContent = miss.optimalHolds.map(describeStoredHold).join("  OR  ");
    correctDecision.append(correctValue);

    decisions.append(yourDecision, correctDecision);
    item.append(number, hand, decisions);
    list.append(item);
  });

  el.challengeReview.append(list);
}

function showChallengeReview() {
  el.challengeSummary.classList.add("hidden");
  el.challengeReview.classList.remove("hidden");
  renderChallengeReview();
  el.challengeReview.scrollIntoView({ block:"start" });
}

function renderChallenge() {
  el.challengeLaunch.disabled = !state.strategy;
  if (!state.challengeFinished) el.challengeReview.classList.add("hidden");
  el.challengeActive.classList.toggle("hidden", state.challengeFinished);
  el.challengeSummary.classList.toggle("hidden", !state.challengeFinished);

  if (state.challengeFinished) {
    renderChallengeCertificate();
    return;
  }

  el.challengeProgress.textContent = `Hand ${state.challengeCompleted + 1} of ${CHALLENGE_HANDS}`;
  el.challengeHand.replaceChildren();

  for (const card of state.challengeHand) {
    el.challengeHand.append(cardButton(card, {
      selected: state.challengeSelected.has(card),
      onClick: () => toggleChallengeCard(card)
    }));
  }

  setMadeHand(el.challengeMadeHand, state.challengeHand);

  const kept = state.challengeHand.filter(card => state.challengeSelected.has(card));
  el.challengeSelection.textContent = kept.length
    ? "Keep: " + kept.map(label).join(" ")
    : "Discard all five cards";
  el.challengeSubmit.disabled = !state.strategy;
}

function chooseRank(r) {
  if (state.lookupHand.length >= 5) return;
  state.pendingRank = r;
  state.lookupResults = [];
  renderLookup();
}

function chooseSuit(s) {
  if (state.pendingRank === null || state.lookupHand.length >= 5) return;
  const card = state.pendingRank + 1 + 13 * s;

  if (state.lookupHand.includes(card)) {
    el.lookupPrompt.textContent = `${label(card)} is already in the hand. Choose another suit.`;
    return;
  }

  state.lookupHand.push(card);
  state.pendingRank = null;
  state.lookupResults = [];
  renderLookup();
}

function removeLookupCard(card) {
  state.lookupHand = state.lookupHand.filter(item => item !== card);
  state.lookupResults = [];
  renderLookup();
}

function clearLookup() {
  state.lookupHand = [];
  state.pendingRank = null;
  state.lookupResults = [];
  renderLookup();
}

function miniCard(card) {
  const span = document.createElement("span");
  span.className = `mini-card suit-${suitClass(card)}`;

  const topSuit = document.createElement("span");
  topSuit.className = "mini-card-suit mini-card-suit-top";
  topSuit.textContent = SUITS[suit(card)];

  const rankText = document.createElement("span");
  rankText.className = "mini-card-rank";
  rankText.textContent = RANKS[rank(card)];

  const bottomSuit = document.createElement("span");
  bottomSuit.className = "mini-card-suit mini-card-suit-bottom";
  bottomSuit.textContent = SUITS[suit(card)];

  span.append(topSuit, rankText, bottomSuit);
  span.setAttribute("aria-label", label(card));
  return span;
}

function importPlayHand() {
  if (state.playHand.length !== 5 || ["dealing", "drawing"].includes(state.playPhase)) return;

  state.lookupHand = [...state.playHand];
  state.pendingRank = null;
  state.lookupResults = [];
  renderLookup();
}

function renderLookupResults() {
  el.lookupFeedback.className = "lookup-feedback";
  el.lookupFeedback.replaceChildren();
  if (!state.lookupResults.length) return;

  const heading = document.createElement("p");
  heading.className = "result-heading";
  heading.textContent = state.lookupResults.length === 1 ? "Optimal hold" : "Tied optimal holds";
  el.lookupFeedback.append(heading);

  const results = document.createElement("div");
  results.className = "hold-results";

  state.lookupResults.forEach((keeper, index) => {
    const box = document.createElement("div");
    box.className = "hold-result";

    if (state.lookupResults.length > 1) {
      const title = document.createElement("div");
      title.className = "hold-result-label";
      title.textContent = `Option ${index + 1}`;
      box.append(title);
    }

    const cards = state.lookupHand.filter(card => keeper.has(card));

    if (cards.length === 0) {
      const discard = document.createElement("span");
      discard.className = "discard-all";
      discard.textContent = "Discard all five cards";
      box.append(discard);
    } else {
      const row = document.createElement("div");
      row.className = "mini-hand";
      cards.forEach(card => row.append(miniCard(card)));
      box.append(row);
    }

    results.append(box);
  });

  el.lookupFeedback.append(results);
}

function renderLookup() {
  el.lookupHand.replaceChildren();
  state.lookupHand.forEach(card => el.lookupHand.append(cardButton(card, { onClick: () => removeLookupCard(card) })));
  for (let i = state.lookupHand.length; i < 5; i += 1) {
    el.lookupHand.append(cardButton(1, { placeholder: true }));
  }

  el.rankPicker.replaceChildren();
  RANKS.forEach((rankLabel, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-button" + (state.pendingRank === index ? " active" : "");
    button.textContent = rankLabel;
    button.disabled = state.lookupHand.length >= 5;
    button.onclick = () => chooseRank(index);
    el.rankPicker.append(button);
  });

  el.suitPicker.replaceChildren();
  SUITS.forEach((symbol, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `picker-button suit-button suit-${["hearts", "diamonds", "clubs", "spades"][index]}`;
    button.textContent = symbol;
    button.disabled = state.pendingRank === null || state.lookupHand.length >= 5;
    button.onclick = () => chooseSuit(index);
    el.suitPicker.append(button);
  });

  if (state.lookupHand.length === 5) {
    el.lookupPrompt.textContent = "Hand complete. Tap a card to remove it, or find the best hold.";
  } else if (state.pendingRank === null) {
    el.lookupPrompt.textContent = `Choose a rank (${state.lookupHand.length}/5 cards entered)`;
  } else {
    el.lookupPrompt.textContent = `Choose the suit for ${RANKS[state.pendingRank]}`;
  }

  el.findHold.disabled = !state.strategy || state.lookupHand.length !== 5;
  el.importFromPlay.disabled =
    state.playHand.length !== 5 || ["dealing", "drawing"].includes(state.playPhase);
  renderLookupResults();
}

function findBestHold() {
  try {
    state.lookupResults = optimal(state.lookupHand);
    renderLookup();
  } catch (error) {
    console.error(error);
    el.lookupFeedback.textContent = "Strategy lookup failed for this hand. See the browser console.";
    el.lookupFeedback.className = "lookup-feedback feedback error";
  }
}

function formatUnits(value) {
  return `${value} ${Math.abs(value) === 1 ? "unit" : "units"}`;
}

function deltaLabel(value) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0 units";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)} ${Math.abs(rounded) === 1 ? "unit" : "units"}`;
}

function togglePlayCard(card) {
  if (state.playPhase !== "holding") return;
  state.playHeld.has(card) ? state.playHeld.delete(card) : state.playHeld.add(card);
  renderPlay();
}

function sleep(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

async function startPlayHand() {
  if (["dealing", "drawing"].includes(state.playPhase)) return;

  state.playBalance -= WAGER;
  state.playOptimalBalance -= WAGER;
  savePlaySession();

  state.playDeck = deck();
  state.playHand = state.playDeck.slice(0, 5);
  state.playDeck = state.playDeck.slice(5);
  state.playHeld.clear();
  state.playHiddenPositions = new Set([0, 1, 2, 3, 4]);
  state.playPhase = "dealing";
  playFeedback("", "");
  clearPlayDecisionIndicator();
  renderPlay();
  renderLookup();

  for (let position = 0; position < 5; position += 1) {
    await sleep(115);
    state.playHiddenPositions.delete(position);
    renderPlay();
  }

  state.playPhase = "holding";
  renderPlay();
  renderLookup();
}

async function drawPlayHand() {
  if (state.playPhase !== "holding") return;

  const initialHand = [...state.playHand];
  const playerHold = [...state.playHeld].sort((a, b) => a - b);
  const orderedDrawPile = [...state.playDeck];
  let decisionWasCorrect = null;
  let optimalHold = null;
  let optimalHolds = [];

  if (state.strategy) {
    try {
      optimalHolds = optimal(initialHand);
      decisionWasCorrect = optimalHolds.some(hold => equal(hold, state.playHeld));

      // If the player's hold is optimal, use that same hold so both paths match exactly.
      // Otherwise use the first optimal hold stored in the strategy table.
      optimalHold = decisionWasCorrect
        ? new Set(state.playHeld)
        : optimalHolds[0];
    } catch (error) {
      console.error("Could not score this Play decision.", error);
    }
  }

  let optimalResult = null;
  if (optimalHold) {
    const optimalFinalHand = [...initialHand];
    const optimalReplacementPositions = initialHand
      .map((card, index) => optimalHold.has(card) ? -1 : index)
      .filter(index => index >= 0);

    optimalReplacementPositions.forEach((position, index) => {
      optimalFinalHand[position] = orderedDrawPile[index];
    });

    optimalResult = evaluateHand(optimalFinalHand);
  }

  const replacementPositions = initialHand
    .map((card, index) => state.playHeld.has(card) ? -1 : index)
    .filter(index => index >= 0);

  const drawnCards = orderedDrawPile.slice(0, replacementPositions.length);
  state.playDeck = orderedDrawPile.slice(replacementPositions.length);

  replacementPositions.forEach((position, index) => {
    state.playHand[position] = drawnCards[index];
  });

  state.playPhase = "drawing";
  state.playHiddenPositions = new Set(replacementPositions);
  playFeedback("", "");
  renderPlay();

  for (const position of replacementPositions) {
    await sleep(140);
    state.playHiddenPositions.delete(position);
    renderPlay();
  }

  state.playPhase = "result";
  state.playHeld.clear();

  const result = evaluateHand(state.playHand);
  state.playBalance += result.payout;
  if (optimalResult) state.playOptimalBalance += optimalResult.payout;

  if (decisionWasCorrect !== null) {
    const handNumber = state.playAttempts + 1;
    state.playAttempts += 1;
    if (decisionWasCorrect) {
      state.playCorrect += 1;
    } else {
      state.playMisses.push({
        handNumber,
        hand: [...initialHand],
        userHold: playerHold,
        optimalHolds: optimalHolds.map(hold => [...hold].sort((a, b) => a - b))
      });
    }
  }

  state.playBalanceHistory.push(state.playBalance);
  state.playOptimalBalanceHistory.push(state.playOptimalBalance);
  savePlaySession();

  if (result.payout > 0) {
    playFeedback(`${result.name} pays ${result.payout} units.`, "correct");
  } else {
    playFeedback("Pays 0 units.", "incorrect");
  }

  renderPlay();
  renderLookup();

  if (decisionWasCorrect !== null) {
    flashPlayDecisionIndicator(decisionWasCorrect);
  }
}

function resetPlayBalance() {
  if (!window.confirm("Reset the balance, accuracy, bankroll history, and incorrect-hand review?")) return;
  state.playBalance = 0;
  state.playOptimalBalance = 0;
  state.playAttempts = 0;
  state.playCorrect = 0;
  state.playBalanceHistory = [0];
  state.playOptimalBalanceHistory = [0];
  state.playMisses = [];
  state.playPhase = "idle";
  state.playHand = [];
  state.playDeck = [];
  state.playHeld.clear();
  state.playHiddenPositions.clear();
  savePlaySession();
  playFeedback("Play session reset to zero.", "");
  clearPlayDecisionIndicator();
  renderPlay();
  renderLookup();
}

function playAction() {
  if (state.playPhase === "holding") drawPlayHand();
  else if (!["dealing", "drawing"].includes(state.playPhase)) startPlayHand();
}

function scheduleBalanceChartDraw() {
  if (balanceChartFrame) return;
  balanceChartFrame = window.requestAnimationFrame(() => {
    balanceChartFrame = 0;
    drawBalanceChart();
  });
}

function drawBalanceChart() {
  const canvas = el.playBalanceChart;
  if (!canvas || canvas.offsetParent === null) return;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  const actualValues = state.playBalanceHistory.length ? state.playBalanceHistory : [0];
  const optimalValues = state.playOptimalBalanceHistory.length
    ? state.playOptimalBalanceHistory
    : [0];
  const signature = `${width}x${height}:${state.playAttempts}:${state.playBalance}:${state.playOptimalBalance}:${actualValues.length}:${optimalValues.length}`;
  if (signature === lastBalanceChartSignature) return;
  lastBalanceChartSignature = signature;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  const allValues = [...actualValues, ...optimalValues];
  const pointCount = Math.max(actualValues.length, optimalValues.length);
  const padding = { left: 10, right: 84, top: 12, bottom: 14 };
  const chartWidth = Math.max(1, rect.width - padding.left - padding.right);
  const chartHeight = Math.max(1, rect.height - padding.top - padding.bottom);

  let minimum = Math.min(0, ...allValues);
  let maximum = Math.max(0, ...allValues);
  if (minimum === maximum) {
    minimum -= 5;
    maximum += 5;
  } else {
    const extra = Math.max(1, (maximum - minimum) * 0.1);
    minimum -= extra;
    maximum += extra;
  }

  const xFor = index => padding.left + (pointCount === 1 ? 0 : index * chartWidth / (pointCount - 1));
  const yFor = value => padding.top + (maximum - value) * chartHeight / (maximum - minimum);
  const zeroY = yFor(0);

  context.save();
  context.strokeStyle = "rgba(203, 191, 159, .45)";
  context.lineWidth = 1;
  context.setLineDash([5, 5]);
  context.beginPath();
  context.moveTo(padding.left, zeroY);
  context.lineTo(rect.width - padding.right, zeroY);
  context.stroke();
  context.restore();

  const buildPath = values => {
    context.beginPath();
    values.forEach((value, index) => {
      const x = xFor(index);
      const y = yFor(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
  };

  if (actualValues.length > 1) {
    context.save();
    context.beginPath();
    context.rect(0, 0, rect.width, Math.max(0, zeroY));
    context.clip();
    buildPath(actualValues);
    context.lineTo(xFor(actualValues.length - 1), zeroY);
    context.lineTo(xFor(0), zeroY);
    context.closePath();
    context.fillStyle = "rgba(76, 207, 121, .13)";
    context.fill();
    context.restore();

    context.save();
    context.beginPath();
    context.rect(0, zeroY, rect.width, Math.max(0, rect.height - zeroY));
    context.clip();
    buildPath(actualValues);
    context.lineTo(xFor(actualValues.length - 1), zeroY);
    context.lineTo(xFor(0), zeroY);
    context.closePath();
    context.fillStyle = "rgba(255, 107, 107, .11)";
    context.fill();
    context.restore();

    const drawClippedLine = (top, bottom, color) => {
      context.save();
      context.beginPath();
      context.rect(0, top, rect.width, Math.max(0, bottom - top));
      context.clip();
      buildPath(actualValues);
      context.strokeStyle = color;
      context.lineWidth = 2.5;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();
      context.restore();
    };

    drawClippedLine(0, zeroY, "#4ccf79");
    drawClippedLine(zeroY, rect.height, "#ff6b6b");
  } else {
    context.fillStyle = "#e7c86a";
    context.beginPath();
    context.arc(xFor(0), yFor(actualValues[0]), 3, 0, Math.PI * 2);
    context.fill();
  }

  if (optimalValues.length > 1) {
    context.save();
    buildPath(optimalValues);
    context.strokeStyle = "#e7c86a";
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
    context.restore();
  }

  const actualLast = actualValues[actualValues.length - 1];
  context.fillStyle = actualLast >= 0 ? "#4ccf79" : "#ff6b6b";
  context.beginPath();
  context.arc(xFor(actualValues.length - 1), yFor(actualLast), 3.5, 0, Math.PI * 2);
  context.fill();

  const optimalLast = optimalValues[optimalValues.length - 1];
  context.fillStyle = "#e7c86a";
  context.beginPath();
  context.arc(xFor(optimalValues.length - 1), yFor(optimalLast), 3, 0, Math.PI * 2);
  context.fill();

  // Show the current counterfactual difference between optimal play and the player.
  const delta = optimalLast - actualLast;
  const latestX = xFor(pointCount - 1);
  const actualY = yFor(actualLast);
  const optimalY = yFor(optimalLast);
  const topY = Math.min(actualY, optimalY);
  const bottomY = Math.max(actualY, optimalY);
  const bracketX = latestX + 12;
  const labelX = bracketX + 7;
  const labelY = Math.min(rect.height - 11, Math.max(11, (topY + bottomY) / 2));
  const deltaLabel = delta === 0
    ? "0 units"
    : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${Math.abs(delta) === 1 ? "unit" : "units"}`;

  context.save();
  context.strokeStyle = "rgba(231, 200, 106, .78)";
  context.fillStyle = "#f8f1df";
  context.lineWidth = 1.4;
  context.lineCap = "round";

  if (Math.abs(actualY - optimalY) < 2.5) {
    context.beginPath();
    context.moveTo(bracketX - 4, actualY);
    context.lineTo(bracketX + 4, actualY);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(bracketX, topY);
    context.lineTo(bracketX, bottomY);
    context.moveTo(bracketX - 4, topY);
    context.lineTo(bracketX + 4, topY);
    context.moveTo(bracketX - 4, bottomY);
    context.lineTo(bracketX + 4, bottomY);
    context.stroke();
  }

  context.font = '700 10px system-ui, -apple-system, "Segoe UI", sans-serif';
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(deltaLabel, labelX, labelY);
  context.restore();

  canvas.setAttribute(
    "aria-label",
    `Line chart comparing your Play balance with optimal play. Current optimal-minus-you difference: ${deltaLabel}.`
  );
}

function renderPlayMissedHands() {
  el.playMissedCount.textContent = String(state.playMisses.length);
  el.playMissedList.replaceChildren();

  if (!state.playMisses.length) {
    const empty = document.createElement("p");
    empty.className = "play-missed-empty";
    empty.textContent = "No incorrect hands yet this session.";
    el.playMissedList.append(empty);
    return;
  }

  state.playMisses.forEach(miss => {
    const item = document.createElement("article");
    item.className = "missed-hand-card play-missed-card";

    const number = document.createElement("div");
    number.className = "missed-hand-number";
    number.textContent = `Hand ${miss.handNumber}`;

    const hand = document.createElement("div");
    hand.className = "mini-hand challenge-review-hand";
    miss.hand.forEach(card => hand.append(miniCard(card)));

    const decisions = document.createElement("div");
    decisions.className = "missed-hold-grid";

    const yourDecision = document.createElement("div");
    yourDecision.className = "missed-hold-row";
    yourDecision.innerHTML = "<span>Your hold</span>";
    const yourValue = document.createElement("strong");
    yourValue.className = "incorrect-decision";
    yourValue.textContent = describeStoredHold(miss.userHold);
    yourDecision.append(yourValue);

    const correctDecision = document.createElement("div");
    correctDecision.className = "missed-hold-row";
    correctDecision.innerHTML = `<span>${miss.optimalHolds.length > 1 ? "Correct holds" : "Correct hold"}</span>`;
    const correctValue = document.createElement("strong");
    correctValue.className = "correct-decision";
    correctValue.textContent = miss.optimalHolds.map(describeStoredHold).join("  OR  ");
    correctDecision.append(correctValue);

    decisions.append(yourDecision, correctDecision);
    item.append(number, hand, decisions);
    el.playMissedList.append(item);
  });
}

function renderPlay() {
  el.playBalance.textContent = formatUnits(state.playBalance);
  el.playBalance.classList.toggle("negative", state.playBalance < 0);
  el.playBalance.classList.toggle("positive", state.playBalance > 0);

  const playAccuracy = state.playAttempts ? 100 * state.playCorrect / state.playAttempts : 0;
  el.playAccuracy.textContent = playAccuracy.toFixed(1) + "%";
  renderPlayMissedHands();
  el.playChartSummary.textContent = `${state.playAttempts} completed ${state.playAttempts === 1 ? "hand" : "hands"}`;
  const delta = Math.round((state.playOptimalBalance - state.playBalance) * 10) / 10;
  el.playDeltaSummary.textContent = `Optimal − you: ${deltaLabel(delta)}`;
  el.playDeltaSummary.classList.toggle("ahead", delta > 0);
  el.playDeltaSummary.classList.toggle("behind", delta < 0);
  scheduleBalanceChartDraw();

  el.playHand.replaceChildren();

  if (state.playHand.length === 0) {
    for (let i = 0; i < 5; i += 1) {
      el.playHand.append(cardButton(1, { cardBack: true }));
    }
  } else {
    state.playHand.forEach((card, index) => {
      el.playHand.append(cardButton(card, {
        selected: state.playPhase === "holding" && state.playHeld.has(card),
        disabled: state.playPhase !== "holding",
        cardBack: state.playHiddenPositions.has(index),
        onClick: () => togglePlayCard(card)
      }));
    });
  }

  el.resetBalance.disabled = ["dealing", "drawing"].includes(state.playPhase);

  if (state.playPhase === "idle") {
    el.playMadeHand.textContent = "";
    el.playMadeHand.classList.remove("visible");
    el.playSelection.textContent = "Press Deal to begin.";
    el.playAction.textContent = "Deal";
    el.playAction.disabled = false;
  } else if (state.playPhase === "dealing") {
    el.playMadeHand.textContent = "";
    el.playMadeHand.classList.remove("visible");
    el.playSelection.textContent = "Dealing...";
    el.playAction.textContent = "Dealing...";
    el.playAction.disabled = true;
  } else if (state.playPhase === "drawing") {
    el.playMadeHand.textContent = "";
    el.playMadeHand.classList.remove("visible");
    el.playSelection.textContent = "Drawing...";
    el.playAction.textContent = "Drawing...";
    el.playAction.disabled = true;
  } else {
    setMadeHand(el.playMadeHand, state.playHand);
    el.playAction.disabled = false;

    if (state.playPhase === "holding") {
      const held = state.playHand.filter(card => state.playHeld.has(card));
      el.playSelection.textContent = held.length ? "Hold: " + held.map(label).join(" ") : "Discard all five cards";
      el.playAction.textContent = "Draw";
    } else {
      el.playSelection.textContent = "Hand complete.";
      el.playAction.textContent = "Deal Next Hand";
    }
  }
}

async function loadURL() {
  const response = await fetch("./JacksOrBetterStrategy.json");
  if (!response.ok) throw new Error(response.status);
  state.strategy = await response.json();
  status("");
  el.challengeLaunch.disabled = false;
  renderTraining();
  renderLookup();
  renderChallenge();
}

el.trainTab.onclick = () => setMode("train");
el.lookupTab.onclick = () => setMode("lookup");
el.playTab.onclick = () => setMode("play");
el.challengeLaunch.onclick = startChallenge;
el.challengeSubmit.onclick = submitChallengeHold;
el.exitChallenge.onclick = leaveChallenge;
el.check.onclick = check;
el.newHand.onclick = deal;
el.reset.onclick = () => {
  state.attempts = 0;
  state.correct = 0;
  saveTrainingScore();
  renderTraining();
};
el.findHold.onclick = findBestHold;
el.clearLookup.onclick = clearLookup;
el.importFromPlay.onclick = importPlayHand;
el.playAction.onclick = playAction;
el.resetBalance.onclick = resetPlayBalance;

deal();
renderLookup();
renderPlay();
renderChallenge();

if ("ResizeObserver" in window && el.playBalanceChart) {
  new ResizeObserver(() => {
    if (state.mode === "play") scheduleBalanceChartDraw();
  }).observe(el.playBalanceChart);
} else {
  window.addEventListener("resize", () => {
    if (state.mode === "play") scheduleBalanceChartDraw();
  }, { passive: true });
}

loadURL().catch(error => {
  console.error(error);
  status("Strategy data could not be loaded. Reload the app or verify that JacksOrBetterStrategy.json is installed.", "error");
});

if ("serviceWorker" in navigator) {
  let waitingWorker = null;
  let reloadingForUpdate = false;

  const showUpdateNotice = worker => {
    if (!worker || !navigator.serviceWorker.controller || !el.updateNotice) return;
    waitingWorker = worker;
    el.updateNotice.classList.remove("hidden");
  };

  const watchedWorkers = new WeakSet();
  const watchWorker = (registration, worker) => {
    if (!worker || watchedWorkers.has(worker)) return;
    watchedWorkers.add(worker);
    const checkState = () => {
      if (worker.state === "installed") showUpdateNotice(registration.waiting || worker);
    };
    worker.addEventListener("statechange", checkState);
    checkState();
  };

  const watchRegistration = registration => {
    if (registration.waiting) showUpdateNotice(registration.waiting);
    watchWorker(registration, registration.installing);
    registration.addEventListener("updatefound", () => watchWorker(registration, registration.installing));
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
      watchRegistration(registration);
    } catch (error) {
      console.warn("Could not register the Jacks or Better service worker.", error);
    }
  };

  if (el.reloadUpdate) {
    el.reloadUpdate.addEventListener("click", () => {
      if (!waitingWorker) return;
      el.reloadUpdate.disabled = true;
      el.reloadUpdate.textContent = "Reloading…";
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadingForUpdate) return;
        reloadingForUpdate = true;
        window.location.reload();
      }, { once: true });
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    });
  }

  window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(registerServiceWorker, { timeout: 2500 });
    else window.setTimeout(registerServiceWorker, 750);
  }, { once: true });
}
