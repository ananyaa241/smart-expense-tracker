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
// Summary
const balanceEl = document.getElementById("balance");
const totalIncomeEl = document.getElementById("total-income");
const totalExpenseEl = document.getElementById("total-expense");
const survivalDaysEl = document.getElementById("survival-days");
const survivalNoteEl = document.getElementById("survival-note");

// Transaction form
const form = document.getElementById("transaction-form");
const typeInput = document.getElementById("type");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const noteInput = document.getElementById("note");

// Receipt
const receiptInput = document.getElementById("receipt-input");
const receiptStatus = document.getElementById("receipt-status");
const receiptHelpBtn = document.getElementById("receipt-help");

// Filters
const filterTypeSelect = document.getElementById("filter-type");
const filterCategorySelect = document.getElementById("filter-category");
const transactionListEl = document.getElementById("transaction-list");

// Sustainability
const sustainScoreEl = document.getElementById("sustain-score");
const sustainTextEl = document.getElementById("sustain-text");

// Upcoming / future
const upcomingForm = document.getElementById("upcoming-form");
const upcomingNameInput = document.getElementById("upcoming-name");
const upcomingAmountInput = document.getElementById("upcoming-amount");
const upcomingDateInput = document.getElementById("upcoming-date");
const upcomingListEl = document.getElementById("upcoming-list");

// Goal / time-to-afford
const goalForm = document.getElementById("goal-form");
const goalNameInput = document.getElementById("goal-name");
const goalCostInput = document.getElementById("goal-cost");
const goalMonthlyInput = document.getElementById("goal-monthly");
const goalSavedInput = document.getElementById("goal-saved");
const goalResultEl = document.getElementById("goal-result");
const goalTextEl = document.getElementById("goal-text");
const goalProgressEl = document.getElementById("goal-progress");

// Shared expenses & bill splitter
const settleForm = document.getElementById("settle-form");
const settleTotalInput = document.getElementById("settle-total");
const settlePeopleInput = document.getElementById("settle-people");
const settleOutputEl = document.getElementById("settle-output");

const itemForm = document.getElementById("item-form");
const itemNameInput = document.getElementById("item-name");
const itemPriceInput = document.getElementById("item-price");
const itemPeopleInput = document.getElementById("item-people");
const itemListEl = document.getElementById("item-list");
const splitItemsBtn = document.getElementById("split-items-btn");
const itemSplitOutputEl = document.getElementById("item-split-output");

// Challenges
const challengeListEl = document.getElementById("challenge-list");

// Voice & theme
const voiceAddBtn = document.getElementById("voice-add-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// ====== LOCAL STORAGE HELPERS ======
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

// ====== UTILITIES ======
function formatCurrency(amount) {
  return "₹" + amount.toFixed(2);
}

function formatDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ====== CALCULATIONS ======
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

// Estimate survival days using last 30 days avg daily spend
function calculateSurvivalDays(balance) {
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;

  const recentExpenses = transactions.filter(
    (t) => t.type === "expense" && new Date(t.date).getTime() >= cutoff
  );

  if (recentExpenses.length === 0 || balance <= 0) {
    survivalDaysEl.textContent = "–";
    survivalNoteEl.textContent = "Need more data to estimate.";
    return;
  }

  const totalRecent = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
  const avgDaily = totalRecent / 30;
  const days = Math.floor(balance / avgDaily);

  survivalDaysEl.textContent = days.toString();
  survivalNoteEl.textContent = `Based on avg daily spend of ${formatCurrency(
    avgDaily
  )}.`;
}

// Sustainability score based on category
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
    sustainTextEl.textContent =
      "Cook more at home and prefer public transport to boost sustainability.";
    return;
  }

  let score = 50; // base
  transactions.forEach((t) => {
    if (t.type === "expense") {
      score += getSustainWeight(t.category);
    }
  });

  score = Math.max(0, Math.min(100, score));
  sustainScoreEl.textContent = score.toString();

  if (score >= 75) {
    sustainTextEl.textContent = "Nice! Your spending choices are quite planet-friendly.";
  } else if (score >= 50) {
    sustainTextEl.textContent =
      "Decent balance. Small changes in commute and food habits can improve this.";
  } else {
    sustainTextEl.textContent =
      "Try cutting down on deliveries, cabs and flights to improve your sustainability.";
  }
}

// ====== RENDERING TRANSACTIONS ======
function renderTransactions() {
  transactionListEl.innerHTML = "";

  const filtered = transactions.filter((t) => {
    const typeMatch = filterType === "all" || t.type === filterType;
    const categoryMatch = filterCategory === "all" || t.category === filterCategory;
    return typeMatch && categoryMatch;
  });

  if (!filtered.length) {
    const li = document.createElement("li");
    li.textContent = "No transactions to show for selected filters.";
    li.classList.add("tiny", "muted");
    transactionListEl.appendChild(li);
    return;
  }

  filtered.forEach((t) => {
    const li = document.createElement("li");
    li.classList.add("transaction-item");

    // Column 1: details
    const mainDiv = document.createElement("div");
    mainDiv.classList.add("transaction-main");

    const titleDiv = document.createElement("div");
    titleDiv.classList.add("transaction-title");
    titleDiv.textContent = t.description;

    const metaDiv = document.createElement("div");
    metaDiv.classList.add("transaction-meta");
    metaDiv.textContent = `${formatDate(t.date)} • ${t.type.toUpperCase()}`;

    const tagsDiv = document.createElement("div");
    tagsDiv.classList.add("transaction-tag-row");
    const catSpan = document.createElement("span");
    catSpan.classList.add("pill", "category");
    catSpan.textContent = t.category;
    tagsDiv.appendChild(catSpan);

    mainDiv.appendChild(titleDiv);
    mainDiv.appendChild(metaDiv);
    mainDiv.appendChild(tagsDiv);

    if (t.note) {
      const noteDiv = document.createElement("div");
      noteDiv.classList.add("transaction-note");
      noteDiv.textContent = t.note;
      mainDiv.appendChild(noteDiv);
    }

    // Column 2: category text
    const col2 = document.createElement("div");
    col2.classList.add("tiny", "muted");
    col2.textContent = t.category;

    // Column 3: amount
    const amountDiv = document.createElement("div");
    const amountSpan = document.createElement("span");
    amountSpan.classList.add("transaction-amount", t.type);
    const sign = t.type === "income" ? "+" : "-";
    amountSpan.textContent = sign + formatCurrency(t.amount);
    amountDiv.appendChild(amountSpan);

    // Column 4: delete button
    const actionsDiv = document.createElement("div");
    const delBtn = document.createElement("button");
    delBtn.classList.add("btn-delete");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      if (confirm("Delete this transaction?")) {
        transactions = transactions.filter((x) => x.id !== t.id);
        saveAll();
        calculateTotals();
        renderTransactions();
      }
    });
    actionsDiv.appendChild(delBtn);

    li.appendChild(mainDiv);
    li.appendChild(col2);
    li.appendChild(amountDiv);
    li.appendChild(actionsDiv);

    transactionListEl.appendChild(li);
  });
}

// ====== UPCOMING EXPENSES ======
function renderUpcoming() {
  upcomingListEl.innerHTML = "";
  if (!upcomingExpenses.length) return;

  upcomingExpenses
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((exp) => {
      const li = document.createElement("li");
      li.textContent = `${exp.name} • ${formatCurrency(exp.amount)} • ${formatDate(
        exp.date
      )}`;
      upcomingListEl.appendChild(li);
    });
}

// ====== GOAL / TIME-TO-AFFORD ======
function handleGoalSubmit(e) {
  e.preventDefault();

  const name = goalNameInput.value.trim();
  const cost = parseFloat(goalCostInput.value);
  const monthly = parseFloat(goalMonthlyInput.value);
  const savedAlready = parseFloat(goalSavedInput.value || "0");

  if (!name || isNaN(cost) || cost <= 0 || isNaN(monthly) || monthly <= 0) {
    alert("Please enter a goal name, cost and monthly saving.");
    return;
  }

  const remaining = Math.max(0, cost - savedAlready);
  const monthsNeeded = Math.ceil(remaining / monthly);

  const now = new Date();
  const targetDate = new Date(now.setMonth(now.getMonth() + monthsNeeded));
  const dateStr = targetDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  goalTextEl.textContent = `If you save ₹${monthly.toFixed(
    0
  )} every month, you can afford "${name}" in about ${
    monthsNeeded || 0
  } month(s), around ${dateStr}.`;

  const progressPct = Math.min(100, (savedAlready / cost) * 100);
  goalProgressEl.style.width = progressPct + "%";

  goalResultEl.classList.remove("hidden");
}

// ====== SHARED EXPENSES & UPI ======
function handleSettleSubmit(e) {
  e.preventDefault();
  const total = parseFloat(settleTotalInput.value || "0");
  const lines = settlePeopleInput.value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!total || !lines.length) {
    alert("Enter total amount and at least one person.");
    return;
  }

  const people = [];
  lines.forEach((line) => {
    const [namePart, amtPart] = line.split(",");
    if (!namePart || !amtPart) return;
    const name = namePart.trim();
    const amt = parseFloat(amtPart.trim());
    if (name && !isNaN(amt)) people.push({ name, paid: amt });
  });

  if (!people.length) {
    alert("Could not parse people lines. Use 'Name, amountPaid'.");
    return;
  }

  const fairShare = total / people.length;
  const results = [];
  people.forEach((p) => {
    const diff = p.paid - fairShare;
    if (Math.abs(diff) < 1) {
      results.push(`${p.name} is settled (±₹1).`);
    } else if (diff > 0) {
      results.push(`${p.name} should receive ${formatCurrency(diff)}.`);
    } else {
      results.push(`${p.name} should pay ${formatCurrency(-diff)}.`);
    }
  });

  settleOutputEl.textContent =
    `Fair share per person: ${formatCurrency(fairShare)}\n` +
    results.join("\n") +
    '\n\nUPI tip: Decide a receiver and generate a UPI link manually like:\nupi://pay?pa=receiver@upi&am=AMOUNT&tn=Room+settlement';
}

// ====== BILL SPLITTER BY ITEM ======
function renderItems() {
  itemListEl.innerHTML = "";
  itemsForSplit.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} • ${formatCurrency(item.price)} • [${item.people.join(
      ", "
    )}]`;
    itemListEl.appendChild(li);
  });
}

function handleItemSubmit(e) {
  e.preventDefault();
  const name = itemNameInput.value.trim();
  const price = parseFloat(itemPriceInput.value || "0");
  const peopleStr = itemPeopleInput.value.trim();

  if (!name || !price || !peopleStr) {
    alert("Enter item name, price and people.");
    return;
  }

  const people = peopleStr.split(",").map((p) => p.trim()).filter(Boolean);
  if (!people.length) {
    alert("Enter at least one person.");
    return;
  }

  itemsForSplit.push({ id: uid(), name, price, people });
  saveAll();
  renderItems();
  itemForm.reset();
}

function handleSplitItems() {
  if (!itemsForSplit.length) {
    alert("Add some items first.");
    return;
  }

  const owed = {};

  itemsForSplit.forEach((item) => {
    const share = item.price / item.people.length;
    item.people.forEach((name) => {
      if (!owed[name]) owed[name] = 0;
      owed[name] += share;
    });
  });

  const lines = Object.entries(owed).map(
    ([name, amt]) => `${name} should pay ${formatCurrency(amt)}.`
  );

  itemSplitOutputEl.textContent = lines.join("\n");
}

// ====== CHALLENGES ======
function initChallenges() {
  if (!challenges.length) {
    challenges = [
      {
        id: "no-swiggy-week",
        title: "No Swiggy Week",
        description: "Avoid food delivery for 7 days straight.",
        completedDays: 0,
        totalDays: 7,
      },
      {
        id: "no-cab-3days",
        title: "No Cab 3 Days",
        description: "Use walking/public transport for 3 days.",
        completedDays: 0,
        totalDays: 3,
      },
    ];
  }
}

function renderChallenges() {
  challengeListEl.innerHTML = "";
  challenges.forEach((c) => {
    const li = document.createElement("li");
    li.classList.add("challenge-item");

    const left = document.createElement("div");
    left.innerHTML = `<strong>${c.title}</strong><br/><span class="tiny muted">${c.description}</span>`;

    const right = document.createElement("div");
    right.classList.add("tiny");
    const pct = Math.round((c.completedDays / c.totalDays) * 100);
    right.textContent = `${c.completedDays}/${c.totalDays} days (${pct}%)`;

    const btn = document.createElement("button");
    btn.classList.add("btn-soft", "small");
    btn.textContent = "+1 Day Done";
    btn.addEventListener("click", () => {
      if (c.completedDays < c.totalDays) {
        c.completedDays += 1;
        saveAll();
        renderChallenges();
      }
    });

    right.appendChild(document.createElement("br"));
    right.appendChild(btn);

    li.appendChild(left);
    li.appendChild(right);
    challengeListEl.appendChild(li);
  });
}

// ====== RECEIPT (Camera + AI stub) ======
function handleReceiptChange() {
  const file = receiptInput.files[0];
  if (!file) {
    receiptStatus.textContent = "";
    return;
  }
  receiptStatus.textContent = `Selected: ${file.name}. In a real version, this would be sent to an OCR/AI service to auto-fill items, taxes, and store details.`;
}

function explainReceiptFeature() {
  alert(
    "Idea: You click a casual photo of a bill (even handwritten), then an AI service reads the text (items, prices, taxes) and auto-fills the expense form. This simple version only accepts the photo and shows a message, but the UI is ready to connect to an OCR API later."
  );
}

// ====== VOICE INPUT ======
function startVoiceLogging() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  voiceAddBtn.textContent = "🎤 Listening…";
  voiceAddBtn.disabled = true;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    parseVoiceExpense(transcript);
    voiceAddBtn.textContent = "🎤 Voice Add";
    voiceAddBtn.disabled = false;
  };

  recognition.onerror = () => {
    alert("Voice recognition error. Try again.");
    voiceAddBtn.textContent = "🎤 Voice Add";
    voiceAddBtn.disabled = false;
  };
}

// ✅ Final fixed parser
function parseVoiceExpense(text) {
  const lower = text.toLowerCase();

  // Detect amount (handles: 50000, 50,000, 50 000, 50.000)
  const amountMatch = lower.match(/(\d[\d.,\s]*)/);
  if (!amountMatch) {
    alert("Could not detect an amount in what you said.");
    return;
  }

  // Remove spaces and commas
  let rawAmount = amountMatch[1].replace(/[\s,]/g, "");

  // Handle cases like "50.000" (dot as thousand separator)
  if (rawAmount.includes(".")) {
    const parts = rawAmount.split(".");
    // If pattern looks like xx.xxx or x.xxx (dot + exactly 3 digits) treat as thousand separator
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      rawAmount = parts[0] + parts[1]; // e.g. "50.000" -> "50000"
    }
  }

  const amount = parseFloat(rawAmount);

  if (isNaN(amount) || amount <= 0) {
    alert("Amount not understood.");
    return;
  }

  // Detect INCOME vs EXPENSE
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

  // Build description
  let description = "Voice transaction";
  const afterOn = lower.split("on")[1];

  if (afterOn && afterOn.trim().length > 0) {
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
  noteInput.value = "[Logged via voice] " + text;

  alert(
    `Detected ${detectedType.toUpperCase()} of ₹${amount.toFixed(
      2
    )}. Review and press Add.`
  );
}

// ====== THEME (placeholder) ======
function toggleTheme() {
  alert(
    "Theme toggle placeholder. You can extend this by switching CSS variables for a light mode."
  );
}

// ====== EVENT HANDLERS ======
function handleAddTransaction(e) {
  e.preventDefault();
  const type = typeInput.value;
  const desc = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const note = noteInput.value.trim();

  if (!desc || isNaN(amount) || amount <= 0) {
    alert("Please enter description and an amount > 0.");
    return;
  }

  const tx = {
    id: uid(),
    type,
    description: desc,
    amount,
    category,
    note,
    date: new Date().toISOString(),
  };

  transactions.push(tx);
  saveAll();
  calculateTotals();
  renderTransactions();

  form.reset();
  typeInput.value = "expense";
  categoryInput.value = "Food - Home Cooking";
}

// Upcoming add
function handleUpcomingSubmit(e) {
  e.preventDefault();
  const name = upcomingNameInput.value.trim();
  const amount = parseFloat(upcomingAmountInput.value || "0");
  const date = upcomingDateInput.value;

  if (!name || !amount || !date) {
    alert("Enter name, amount and date for upcoming expense.");
    return;
  }

  upcomingExpenses.push({ id: uid(), name, amount, date });
  saveAll();
  renderUpcoming();
  upcomingForm.reset();
}

// Filters
function handleFilterChange() {
  filterType = filterTypeSelect.value;
  filterCategory = filterCategorySelect.value;
  renderTransactions();
}

// ====== INIT ======
function init() {
  loadAll();
  initChallenges();
  calculateTotals();
  renderTransactions();
  renderUpcoming();
  renderChallenges();
  renderItems();

  // Listeners
  form.addEventListener("submit", handleAddTransaction);
  filterTypeSelect.addEventListener("change", handleFilterChange);
  filterCategorySelect.addEventListener("change", handleFilterChange);

  upcomingForm.addEventListener("submit", handleUpcomingSubmit);
  goalForm.addEventListener("submit", handleGoalSubmit);

  settleForm.addEventListener("submit", handleSettleSubmit);
  itemForm.addEventListener("submit", handleItemSubmit);
  splitItemsBtn.addEventListener("click", handleSplitItems);

  receiptInput.addEventListener("change", handleReceiptChange);
  receiptHelpBtn.addEventListener("click", explainReceiptFeature);

  voiceAddBtn.addEventListener("click", startVoiceLogging);
  themeToggleBtn.addEventListener("click", toggleTheme);
}

document.addEventListener("DOMContentLoaded", init);
