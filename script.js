// ====== GLOBAL STATE ======
let transactions = [];
let filterType = "all";
let filterCategory = "all";

let upcomingExpenses = [];
let challenges = [];
let itemsForSplit = [];

// LocalStorage keys
const STORAGE_TX = "smart_expense_transactions";
const STORAGE_UPCOMING = "smart_expense_upcoming";
const STORAGE_CHALLENGES = "smart_expense_challenges";
const STORAGE_ITEMS = "smart_expense_items";

// ====== DOM ELEMENTS ======
const balanceEl = document.getElementById("balance");
const totalIncomeEl = document.getElementById("total-income");
const totalExpenseEl = document.getElementById("total-expense");
const survivalDaysEl = document.getElementById("survival-days");
const survivalNoteEl = document.getElementById("survival-note");

const form = document.getElementById("transaction-form");
const typeInput = document.getElementById("type");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const noteInput = document.getElementById("note");

const receiptInput = document.getElementById("receipt-input");
const receiptStatus = document.getElementById("receipt-status");
const receiptHelpBtn = document.getElementById("receipt-help");

const filterTypeSelect = document.getElementById("filter-type");
const filterCategorySelect = document.getElementById("filter-category");
const transactionListEl = document.getElementById("transaction-list");

const sustainScoreEl = document.getElementById("sustain-score");
const sustainTextEl = document.getElementById("sustain-text");

// Upcoming
const upcomingForm = document.getElementById("upcoming-form");
const upcomingNameInput = document.getElementById("upcoming-name");
const upcomingAmountInput = document.getElementById("upcoming-amount");
const upcomingDateInput = document.getElementById("upcoming-date");
const upcomingListEl = document.getElementById("upcoming-list");

// Goals
const goalForm = document.getElementById("goal-form");
const goalNameInput = document.getElementById("goal-name");
const goalCostInput = document.getElementById("goal-cost");
const goalMonthlyInput = document.getElementById("goal-monthly");
const goalSavedInput = document.getElementById("goal-saved");
const goalResultEl = document.getElementById("goal-result");
const goalTextEl = document.getElementById("goal-text");
const goalProgressEl = document.getElementById("goal-progress");

// Shared expenses
const settleForm = document.getElementById("settle-form");
const settleTotalInput = document.getElementById("settle-total");
const settlePeopleInput = document.getElementById("settle-people");
const settleOutputEl = document.getElementById("settle-output");

// Bill splitter
const itemForm = document.getElementById("item-form");
const itemNameInput = document.getElementById("item-name");
const itemPriceInput = document.getElementById("item-price");
const itemPeopleInput = document.getElementById("item-people");
const itemListEl = document.getElementById("item-list");
const splitItemsBtn = document.getElementById("split-items-btn");
const itemSplitOutputEl = document.getElementById("item-split-output");

// Challenges
const challengeListEl = document.getElementById("challenge-list");

// Voice
const voiceAddBtn = document.getElementById("voice-add-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// ====== LOCAL STORAGE ======
function saveAll() {
  localStorage.setItem(STORAGE_TX, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_UPCOMING, JSON.stringify(upcomingExpenses));
  localStorage.setItem(STORAGE_CHALLENGES, JSON.stringify(challenges));
  localStorage.setItem(STORAGE_ITEMS, JSON.stringify(itemsForSplit));
}

function loadAll() {
  transactions = JSON.parse(localStorage.getItem(STORAGE_TX) || "[]");
  upcomingExpenses = JSON.parse(localStorage.getItem(STORAGE_UPCOMING) || "[]");
  challenges = JSON.parse(localStorage.getItem(STORAGE_CHALLENGES) || "[]");
  itemsForSplit = JSON.parse(localStorage.getItem(STORAGE_ITEMS) || "[]");
}

// ====== UTILS ======
function formatCurrency(amount) {
  return "₹" + amount.toFixed(2);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ====== TOTALS ======
function calculateTotals() {
  let income = 0;
  let expense = 0;

  transactions.forEach((t) => {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  });

  const balance = income - expense;
  balanceEl.textContent = formatCurrency(balance);
  totalIncomeEl.textContent = formatCurrency(income);
  totalExpenseEl.textContent = formatCurrency(expense);

  calculateSurvivalDays(balance);
  calculateSustainabilityScore();
}

// ====== SURVIVAL ======
function calculateSurvivalDays(balance) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const recent = transactions.filter(
    (t) => t.type === "expense" && new Date(t.date).getTime() >= cutoff
  );

  if (!recent.length || balance <= 0) {
    survivalDaysEl.textContent = "–";
    survivalNoteEl.textContent = "Need more data.";
    return;
  }

  const totalRecent = recent.reduce((sum, t) => sum + t.amount, 0);
  const avgDaily = totalRecent / 30;
  const days = Math.floor(balance / avgDaily);

  survivalDaysEl.textContent = days;
  survivalNoteEl.textContent = `Avg daily spend ${formatCurrency(avgDaily)}`;
}

// ====== SUSTAINABILITY ======
function getSustainWeight(category) {
  if (!category) return 0;
  if (category.includes("Home Cooking")) return 2;
  if (category.includes("Public")) return 2;
  if (category.includes("Train/Bus")) return 1.5;
  if (category.includes("Delivery")) return -1.5;
  if (category.includes("Cab/Auto")) return -1;
  if (category.includes("Flight")) return -3;
  return 0;
}

function calculateSustainabilityScore() {
  if (!transactions.length) {
    sustainScoreEl.textContent = "–";
    sustainTextEl.textContent = "No data yet.";
    return;
  }

  let score = 50;

  transactions.forEach((t) => {
    if (t.type === "expense") score += getSustainWeight(t.category);
  });

  score = Math.max(0, Math.min(100, score));
  sustainScoreEl.textContent = score;
}

// ====== ✅ UPDATED VOICE LOGGING ======
function startVoiceLogging() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice not supported on this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.maxAlternatives = 1;

  recognition.start();
  voiceAddBtn.textContent = "🎤 Listening...";
  voiceAddBtn.disabled = true;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    parseVoiceExpense(transcript);
    voiceAddBtn.textContent = "🎤 Voice Add";
    voiceAddBtn.disabled = false;
  };

  recognition.onerror = () => {
    alert("Voice error. Try again.");
    voiceAddBtn.textContent = "🎤 Voice Add";
    voiceAddBtn.disabled = false;
  };
}

// ✅ FINAL FIXED FUNCTION
function parseVoiceExpense(text) {
  const lower = text.toLowerCase();

  // ✅ Detect amount (handles: 50000, 50,000, 50 000, 50.000)
  const amountMatch = lower.match(/(\d[\d.,\s]*)/);
  if (!amountMatch) {
    alert("Could not detect an amount.");
    return;
  }

  // Remove spaces and commas
  let rawAmount = amountMatch[1].replace(/[\s,]/g, "");

  // ✅ Handle "50.000" -> 50000
  if (rawAmount.includes(".")) {
    const parts = rawAmount.split(".");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      rawAmount = parts[0] + parts[1];
    }
  }

  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    alert("Amount not understood.");
    return;
  }

  // ✅ Detect income vs expense
  let detectedType = "expense";

  if (
    /salary|credited|income|received|got|allowance|stipend|pocket money/.test(
      lower
    )
  ) {
    detectedType = "income";
  }

  if (/spent|paid|bought|recharged|recharge|gave/.test(lower)) {
    detectedType = "expense";
  }

  // ✅ Description
  let description = "Voice transaction";
  const afterOn = lower.split("on")[1];

  if (afterOn && afterOn.trim()) {
    description = afterOn.trim();
  } else if (detectedType === "income" && /salary/.test(lower)) {
    description = "Salary";
  } else if (detectedType === "income") {
    description = "Income";
  } else {
    description = "Expense";
  }

  typeInput.value = detectedType;
  amountInput.value = amount;
  descriptionInput.value = description;
  noteInput.value = `[Logged via voice] ${text}`;
}

// ====== EVENT LISTENERS ======
function init() {
  loadAll();
  calculateTotals();
  renderTransactions();

  form.addEventListener("submit", handleAddTransaction);
  voiceAddBtn.addEventListener("click", startVoiceLogging);
}

document.addEventListener("DOMContentLoaded", init);
