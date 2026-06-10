const lessonGroups = Array.isArray(window.builtInLessonGroups)
  ? window.builtInLessonGroups
  : [];
const builtInLessons = lessonGroups.flatMap((group, groupIndex) =>
  group.rows.map((row, rowIndex) => ({
    id: String(groupIndex * 10 + rowIndex + 1),
    level: group.level,
    topic: group.topic,
    vi: row[0],
    answers: row[1],
    focus: row[2] || group.focus,
    source: "built-in",
  })),
);

const importedLessons = (
  Array.isArray(window.importedDocxLessons) ? window.importedDocxLessons : []
).map(normalizeLessonRecord);
const customLessons = loadCustomLessons();
let lessons = [...builtInLessons, ...importedLessons, ...customLessons];
let listeningItems = createListeningItems(lessons);

const plans = {
  FREE: {
    name: "FREE",
    levels: ["A1", "A2"],
    dailyLimit: 20,
    customLimit: 20,
    customDailyLimit: 20,
    advancedAnalysis: false,
  },
  PREMIUM: {
    name: "PREMIUM",
    levels: ["A1", "A2", "B1", "B2"],
    dailyLimit: Infinity,
    customLimit: Infinity,
    customDailyLimit: Infinity,
    advancedAnalysis: true,
  },
};

const paymentConfig = {
  provider: "PAYOS_PENDING",
  method: "VietQR qua PayOS",
  packages: [
    { id: "premium_1m", label: "1 tháng", price: 35000 },
    { id: "premium_6m", label: "6 tháng", price: 149000 },
    { id: "premium_12m", label: "1 năm", price: 249000 },
  ],
};

const state = {
  level: "A1",
  topic: "all",
  practiceFilter: localStorage.getItem("englishTrainerPracticeFilter") || "all",
  studyMode: localStorage.getItem("englishTrainerStudyMode") || "normal",
  vocabularyQuery: localStorage.getItem("englishTrainerVocabularyQuery") || "",
  grammarFocus: localStorage.getItem("englishTrainerGrammarFocus") || "all",
  speechRate: localStorage.getItem("englishTrainerSpeechRate") || "0.75",
  currentUser: getCurrentUser(),
  usage: getTodayUsage(),
  queue: [],
  index: 0,
  checkedCurrent: false,
  hintCount: 0,
  listeningQueue: [],
  listeningIndex: 0,
  listeningCurrent: null,
  listeningCheckedCurrent: false,
  history: [],
  stats: safeJsonParse(localStorage.getItem("englishTrainerStats"), {}),
};

const defaultStats = {
  attempts: 0,
  correct: 0,
  close: 0,
  streak: 0,
  seen: {},
  weak: {},
};
state.stats = {
  ...defaultStats,
  ...state.stats,
  seen: state.stats.seen || {},
  weak: state.stats.weak || {},
};

const els = {
  doneStat: document.getElementById("doneStat"),
  accuracyStat: document.getElementById("accuracyStat"),
  streakStat: document.getElementById("streakStat"),
  topicSelect: document.getElementById("topicSelect"),
  practiceFilterSelect: document.getElementById("practiceFilterSelect"),
  studyModeSelect: document.getElementById("studyModeSelect"),
  vocabularyInput: document.getElementById("vocabularyInput"),
  vocabularyFilterWrap: document.getElementById("vocabularyFilterWrap"),
  grammarSelect: document.getElementById("grammarSelect"),
  grammarFilterWrap: document.getElementById("grammarFilterWrap"),
  studyFilterStatus: document.getElementById("studyFilterStatus"),
  levelPill: document.getElementById("levelPill"),
  topicPill: document.getElementById("topicPill"),
  indexPill: document.getElementById("indexPill"),
  vietnamesePrompt: document.getElementById("vietnamesePrompt"),
  answerInput: document.getElementById("answerInput"),
  checkBtn: document.getElementById("checkBtn"),
  hintBtn: document.getElementById("hintBtn"),
  nextBtn: document.getElementById("nextBtn"),
  resetBtn: document.getElementById("resetBtn"),
  feedback: document.getElementById("feedback"),
  listeningInput: document.getElementById("listeningInput"),
  listeningStatus: document.getElementById("listeningStatus"),
  listeningLevelPill: document.getElementById("listeningLevelPill"),
  startListeningBtn: document.getElementById("startListeningBtn"),
  repeatListeningBtn: document.getElementById("repeatListeningBtn"),
  checkListeningBtn: document.getElementById("checkListeningBtn"),
  nextListeningBtn: document.getElementById("nextListeningBtn"),
  listeningFeedback: document.getElementById("listeningFeedback"),
  translatorInput: document.getElementById("translatorInput"),
  translatorOutput: document.getElementById("translatorOutput"),
  translateBtn: document.getElementById("translateBtn"),
  translatorStatus: document.getElementById("translatorStatus"),
  translatorDirection: document.getElementById("translatorDirection"),
  speechRateSelect: document.getElementById("speechRateSelect"),
  customEnglishInput: document.getElementById("customEnglishInput"),
  customVietnameseInput: document.getElementById("customVietnameseInput"),
  customTopicInput: document.getElementById("customTopicInput"),
  customLevelSelect: document.getElementById("customLevelSelect"),
  addCustomBtn: document.getElementById("addCustomBtn"),
  customStatus: document.getElementById("customStatus"),
  accountMenuBtn: document.getElementById("accountMenuBtn"),
  accountMenuPanel: document.getElementById("accountMenuPanel"),
  accountStatus: document.getElementById("accountStatus"),
  authForm: document.getElementById("authForm"),
  sessionActions: document.getElementById("sessionActions"),
  usernameInput: document.getElementById("usernameInput"),
  passwordInput: document.getElementById("passwordInput"),
  loginBtn: document.getElementById("loginBtn"),
  registerBtn: document.getElementById("registerBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  planStatus: document.getElementById("planStatus"),
  upgradeInfoBtn: document.getElementById("upgradeInfoBtn"),
  progressText: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  levelList: document.getElementById("levelList"),
  historyList: document.getElementById("historyList"),
};

const contractions = new Map([
  ["i'm", "i am"],
  ["you're", "you are"],
  ["he's", "he is"],
  ["she's", "she is"],
  ["it's", "it is"],
  ["we're", "we are"],
  ["they're", "they are"],
  ["isn't", "is not"],
  ["aren't", "are not"],
  ["don't", "do not"],
  ["doesn't", "does not"],
  ["didn't", "did not"],
  ["can't", "cannot"],
  ["couldn't", "could not"],
  ["won't", "will not"],
  ["wouldn't", "would not"],
  ["haven't", "have not"],
  ["hasn't", "has not"],
  ["hadn't", "had not"],
  ["that's", "that is"],
  ["what's", "what is"],
]);

const articles = new Set(["a", "an", "the"]);
const beForms = new Set([
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
]);
const prepositions = new Set([
  "in",
  "on",
  "at",
  "to",
  "for",
  "from",
  "with",
  "about",
  "of",
  "before",
  "after",
  "into",
  "by",
  "than",
]);
const auxiliaries = new Set([
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "should",
  "must",
  "have",
  "has",
  "had",
]);
const weakVocabulary = new Set([
  "very",
  "good",
  "bad",
  "nice",
  "thing",
  "get",
  "make",
  "do",
]);

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function seedUsers() {
  const seeded = [
    { username: "free01", password: "free01", plan: "FREE" },
    { username: "free02", password: "free02", plan: "FREE" },
    { username: "free03", password: "free03", plan: "FREE" },
    { username: "premium01", password: "premium01", plan: "PREMIUM" },
    { username: "premium02", password: "premium02", plan: "PREMIUM" },
    { username: "premium03", password: "premium03", plan: "PREMIUM" },
    { username: "premium04", password: "premium04", plan: "PREMIUM" },
    { username: "premium05", password: "premium05", plan: "PREMIUM" },
  ];
  const users = safeJsonParse(localStorage.getItem("englishTrainerUsers"), []);
  const merged = [...users];
  seeded.forEach((seed) => {
    if (!merged.some((user) => user.username === seed.username))
      merged.push(seed);
  });
  localStorage.setItem("englishTrainerUsers", JSON.stringify(merged));
  return merged;
}

function getUsers() {
  return seedUsers();
}

function saveUsers(users) {
  localStorage.setItem("englishTrainerUsers", JSON.stringify(users));
}

function getCurrentUser() {
  return safeJsonParse(localStorage.getItem("englishTrainerCurrentUser"), null);
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(
      "englishTrainerCurrentUser",
      JSON.stringify({
        username: user.username,
        plan: user.plan,
      }),
    );
  } else {
    localStorage.removeItem("englishTrainerCurrentUser");
  }
  state.currentUser = user
    ? { username: user.username, plan: user.plan }
    : null;
  state.usage = getTodayUsage();
}

function activeUser() {
  return state.currentUser || { username: "guest", plan: "FREE" };
}

function activePlan() {
  return plans[activeUser().plan] || plans.FREE;
}

function getTodayUsage() {
  const key = todayKey();
  const usage = safeJsonParse(localStorage.getItem("englishTrainerUsage"), {});
  if (usage.date !== key) {
    return { date: key, byUser: {} };
  }
  return { date: key, byUser: usage.byUser || {} };
}

function saveUsage() {
  localStorage.setItem("englishTrainerUsage", JSON.stringify(state.usage));
}

function usageForActiveUser() {
  const username = activeUser().username;
  if (!state.usage.byUser[username]) {
    state.usage.byUser[username] = { practice: 0, customAddedToday: 0 };
  }
  return state.usage.byUser[username];
}

function canPracticeMore() {
  const plan = activePlan();
  if (plan.dailyLimit === Infinity) return true;
  return usageForActiveUser().practice < plan.dailyLimit;
}

function consumePracticeAttempt() {
  const usage = usageForActiveUser();
  usage.practice += 1;
  saveUsage();
}

function customLessonsForActiveUser() {
  const username = activeUser().username;
  return customLessons.filter(
    (lesson) => !lesson.owner || lesson.owner === username,
  );
}

function canAddCustomLesson() {
  const plan = activePlan();
  if (plan.customLimit === Infinity) return true;
  return customLessonsForActiveUser().length < plan.customLimit;
}

function canAddCustomToday() {
  const plan = activePlan();
  if (plan.customDailyLimit === Infinity) return true;
  return usageForActiveUser().customAddedToday < plan.customDailyLimit;
}

function consumeCustomAdd() {
  const usage = usageForActiveUser();
  usage.customAddedToday += 1;
  saveUsage();
}

function buildPremiumAnalysis(expectedText, actualText, lesson) {
  if (!activePlan().advancedAnalysis) return [];
  const expected = tokens(expectedText);
  const actual = tokens(actualText);
  const missing = expected.filter((word) => !actual.includes(word));
  const extra = actual.filter((word) => !expected.includes(word));
  const details = [];
  if (missing.length) {
    details.push(
      `Phân tích PREMIUM: câu mẫu cần "${uniqueShort(missing, 4).join(", ")}" vì đây là phần mang nghĩa/cấu trúc chính của câu.`,
    );
  }
  if (extra.length) {
    details.push(
      `Phân tích PREMIUM: "${uniqueShort(extra, 4).join(", ")}" có thể làm lệch cấu trúc so với câu chuẩn; hãy kiểm tra lại thì, giới từ và trật tự từ.`,
    );
  }
  details.push(
    `Trọng tâm cần nhớ: ${lesson.focus || "diễn đạt tự nhiên trong tiếng Anh"}.`,
  );
  return details.slice(0, 3);
}

function normalizeLessonRecord(record) {
  const english = Array.isArray(record.answers)
    ? record.answers.filter(Boolean)
    : [record.answer || record.text].filter(Boolean);
  return {
    id: String(record.id || `external-${Math.random().toString(36).slice(2)}`),
    level: ["A1", "A2", "B1", "B2"].includes(record.level)
      ? record.level
      : "A2",
    topic: record.topic || "Câu nhập thêm",
    vi: record.vi || record.vietnamese || english[0] || "Câu tiếng Anh",
    answers: english.length ? english : ["I need to add an English sentence."],
    focus: record.focus || "câu tiếng Anh trong kho dữ liệu",
    source: record.source || "external",
    owner: record.owner || null,
  };
}

function loadCustomLessons() {
  return safeJsonParse(
    localStorage.getItem("englishTrainerCustomLessons"),
    [],
  ).map(normalizeLessonRecord);
}

function saveCustomLessons() {
  localStorage.setItem(
    "englishTrainerCustomLessons",
    JSON.stringify(customLessons),
  );
}

function createListeningItems(sourceLessons) {
  return sourceLessons.map((lesson) => ({
    id: lesson.id,
    level: lesson.level,
    topic: lesson.topic,
    vi: lesson.vi,
    text: lesson.answers[0],
    answers: [lesson.answers[0]],
    focus: lesson.focus,
  }));
}

function refreshLessonCollections() {
  lessons = [
    ...builtInLessons,
    ...importedLessons,
    ...customLessonsForActiveUser(),
  ];
  listeningItems = createListeningItems(lessons);
}

function isAllowedByPlan(item) {
  return activePlan().levels.includes(item.level);
}

function normalize(text) {
  let out = text.toLowerCase().trim();
  contractions.forEach((full, short) => {
    out = out.replace(
      new RegExp("\\b" + escapeRegExp(short) + "\\b", "g"),
      full,
    );
  });
  return out
    .replace(/ha noi/g, "hanoi")
    .replace(/o'clock/g, "oclock")
    .replace(/minutes'/g, "minutes")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokens(text) {
  const normalized = normalize(text);
  return normalized ? normalized.split(" ") : [];
}

function detectTranslationTarget(text) {
  const vietnameseMarks =
    /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
  const commonVietnameseWords =
    /\b(tôi|bạn|anh|chị|em|là|của|và|hoặc|không|có|một|những|các|đang|đã|sẽ|muốn|cần|học|dịch)\b/i;
  return vietnameseMarks.test(text) || commonVietnameseWords.test(text) ? "en" : "vi";
}

function readGoogleTranslateResult(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
  return data[0]
    .map((part) => (Array.isArray(part) ? part[0] : ""))
    .filter(Boolean)
    .join("");
}

async function translateMiniText() {
  const sourceText = els.translatorInput.value.trim();
  if (!sourceText) {
    els.translatorOutput.value = "";
    els.translatorStatus.textContent = "Nhập nội dung cần dịch trước.";
    els.translatorDirection.textContent = "Auto";
    els.translatorInput.focus();
    return;
  }

  const targetLang = detectTranslationTarget(sourceText);
  const directionText = targetLang === "en" ? "VI -> EN" : "EN -> VI";
  const apiUrl =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=` +
    encodeURIComponent(sourceText);

  els.translateBtn.disabled = true;
  els.translatorDirection.textContent = directionText;
  els.translatorStatus.textContent = "Đang dịch...";

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const translatedText = readGoogleTranslateResult(data);
    els.translatorOutput.value = translatedText || "Không đọc được kết quả dịch.";
    els.translatorStatus.textContent = translatedText ? "Đã dịch xong." : "Không có kết quả phù hợp.";
  } catch (error) {
    console.error("Translate mini failed:", error);
    els.translatorOutput.value = "";
    els.translatorStatus.textContent =
      "Không thể dịch lúc này. Hãy kiểm tra kết nối mạng hoặc thử lại sau.";
  } finally {
    els.translateBtn.disabled = false;
  }
}

const grammarGroups = [
  {
    label: "Thì hiện tại đơn",
    match: ["present simple", "do you", "does", "thói quen", "hằng ngày"],
  },
  {
    label: "Thì hiện tại tiếp diễn",
    match: ["present continuous", "am/is/are + v-ing", "đang"],
  },
  {
    label: "Thì hiện tại hoàn thành",
    match: ["present perfect", "have you been", "i've been", "for/since", "hiện tại hoàn thành"],
  },
  {
    label: "Thì quá khứ đơn",
    match: ["past simple", "quá khứ đơn", "just"],
  },
  {
    label: "Thì quá khứ hoàn thành",
    match: ["past perfect", "quá khứ hoàn thành"],
  },
  {
    label: "Thì tương lai",
    match: ["will", "be going to", "future", "kế hoạch"],
  },
  {
    label: "Động từ to be",
    match: ["to be", "i'm", "i am", "is +", "are you", "my name is", "this is", "there are"],
  },
  {
    label: "Câu hỏi",
    match: ["question", "wh-question", "yes-no", "how old", "where are", "what do", "câu hỏi"],
  },
  {
    label: "Động từ khuyết thiếu",
    match: ["can", "could", "should", "may i", "must", "have to", "need"],
  },
  {
    label: "Câu điều kiện",
    match: ["conditional", "unless", "provided that", "even if", "điều kiện"],
  },
  {
    label: "Câu bị động",
    match: ["passive", "bị động", "need to be"],
  },
  {
    label: "Câu tường thuật",
    match: ["reported speech", "tường thuật"],
  },
  {
    label: "Mệnh đề quan hệ",
    match: ["relative clause", "mệnh đề quan hệ"],
  },
  {
    label: "So sánh",
    match: ["comparative", "comparison", "so sánh", "the more"],
  },
  {
    label: "Giới từ",
    match: ["preposition", "prepositions", "work at", "live in", "from +", "giới từ"],
  },
  {
    label: "Danh động từ và động từ nguyên mẫu",
    match: ["gerund", "infinitive", "like + gerund", "let me"],
  },
  {
    label: "Liên từ và nhượng bộ",
    match: ["connector", "although", "because of", "so that", "despite", "instead of", "nhượng bộ", "liên từ"],
  },
  {
    label: "Yêu cầu và giao tiếp lịch sự",
    match: ["request", "indirect question", "please", "lịch sự", "xin phép"],
  },
  {
    label: "Cụm từ và mẫu câu thông dụng",
    match: ["phrase", "phrases", "cấu trúc", "cách nói", "lời chúc", "chào hỏi", "tạm biệt"],
  },
];

function grammarKey(item) {
  const haystack = `${item.focus || ""} ${item.topic || ""} ${(item.answers || []).join(" ")}`.toLowerCase();
  const normalizedHaystack = normalize(haystack);
  const group = grammarGroups.find((entry) =>
    entry.match.some((pattern) => {
      const lowerPattern = pattern.toLowerCase();
      return (
        haystack.includes(lowerPattern) ||
        normalizedHaystack.includes(normalize(lowerPattern))
      );
    }),
  );
  return group ? group.label : "Ngữ pháp và mẫu câu khác";
}

function vocabularyMatches(item, query) {
  const search = normalize(query);
  if (!search) return true;
  const variants = new Set([search]);
  if (search.endsWith("y") && search.length > 2)
    variants.add(`${search.slice(0, -1)}ies`);
  variants.add(`${search}s`);
  variants.add(`${search}es`);
  variants.add(`${search}ed`);
  variants.add(`${search}ing`);
  return item.answers.some((answer) => {
    const words = tokens(answer);
    return words.some((word) => variants.has(word));
  });
}

function applyStudyFilter(items) {
  if (state.studyMode === "vocabulary") {
    const query = state.vocabularyQuery.trim();
    if (!query) return items;
    return items.filter((item) => vocabularyMatches(item, query));
  }
  if (state.studyMode === "grammar" && state.grammarFocus !== "all") {
    return items.filter((item) => grammarKey(item) === state.grammarFocus);
  }
  return items;
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[a.length][b.length];
}

function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function countMap(list) {
  return list.reduce(
    (map, item) => map.set(item, (map.get(item) || 0) + 1),
    new Map(),
  );
}

function diffWords(expected, actual) {
  const expectedMap = countMap(expected);
  const actualMap = countMap(actual);
  const missing = [];
  const extra = [];
  expectedMap.forEach((count, word) => {
    const gap = count - (actualMap.get(word) || 0);
    for (let i = 0; i < gap; i++) missing.push(word);
  });
  actualMap.forEach((count, word) => {
    const gap = count - (expectedMap.get(word) || 0);
    for (let i = 0; i < gap; i++) extra.push(word);
  });
  return { missing, extra };
}

function similarity(expected, actual) {
  const e = normalize(expected);
  const a = normalize(actual);
  if (!a) return 0;
  if (e === a) return 1;
  const charScore = 1 - levenshtein(e, a) / Math.max(e.length, a.length, 1);
  const et = tokens(expected);
  const at = tokens(actual);
  const orderScore = lcs(et, at) / Math.max(et.length, at.length, 1);
  const eSet = new Set(et);
  const aSet = new Set(at);
  let overlap = 0;
  aSet.forEach((word) => {
    if (eSet.has(word)) overlap++;
  });
  const tokenScore = overlap / Math.max(eSet.size, aSet.size, 1);
  return Math.max(0, charScore * 0.35 + orderScore * 0.4 + tokenScore * 0.25);
}

function bestMatch(answer, lesson) {
  return lesson.answers
    .map((sample) => ({ sample, score: similarity(sample, answer) }))
    .sort((a, b) => b.score - a.score)[0];
}

function uniqueShort(list, limit = 6) {
  return [...new Set(list)].filter(Boolean).slice(0, limit);
}

function hasWord(list, word) {
  return list.includes(word);
}

function baseVerb(word) {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (/(ches|shes|xes|zes|ses|oes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

function detectIssues(expectedText, actualText) {
  const expected = tokens(expectedText);
  const actual = tokens(actualText);
  const { missing, extra } = diffWords(expected, actual);
  const notes = [];

  const missingArticles = missing.filter((word) => articles.has(word));
  if (missingArticles.length) {
    notes.push(
      `Ngữ pháp: bạn đang thiếu mạo từ "${uniqueShort(missingArticles).join(", ")}". Trong câu mẫu, danh từ cần mạo từ để tự nhiên hơn.`,
    );
  }

  const missingBe = missing.filter((word) => beForms.has(word));
  if (missingBe.length) {
    notes.push(
      `Ngữ pháp: kiểm tra động từ "to be". Câu này cần "${uniqueShort(missingBe).join(", ")}".`,
    );
  }

  const missingAux = missing.filter((word) => auxiliaries.has(word));
  if (missingAux.length) {
    notes.push(
      `Ngữ pháp: bạn có thể đang thiếu trợ động từ "${uniqueShort(missingAux).join(", ")}", nên thì/câu hỏi/câu phủ định chưa đúng.`,
    );
  }

  const expectedPrep = expected.filter((word) => prepositions.has(word));
  const actualPrep = actual.filter((word) => prepositions.has(word));
  const wrongPrep = expectedPrep.filter((word) => !actualPrep.includes(word));
  if (wrongPrep.length) {
    notes.push(
      `Từ vựng/giới từ: câu này hợp với "${uniqueShort(wrongPrep).join(", ")}". Gợi ý: giới từ trong tiếng Anh thường không dịch từng chữ từ tiếng Việt.`,
    );
  }

  const expectedThirdPerson = expected.find(
    (word, i) =>
      i > 0 &&
      ["he", "she", "it"].includes(expected[i - 1]) &&
      word.endsWith("s") &&
      !beForms.has(word),
  );
  if (
    expectedThirdPerson &&
    actual.includes(baseVerb(expectedThirdPerson)) &&
    !actual.includes(expectedThirdPerson)
  ) {
    notes.push(
      `Ngữ pháp: với "he/she/it" ở hiện tại đơn, động từ thường cần thêm "-s/-es": "${expectedThirdPerson}".`,
    );
  }

  const expectedPast = expected.find(
    (word) =>
      word.endsWith("ed") ||
      [
        "met",
        "saw",
        "went",
        "left",
        "had",
        "was",
        "were",
        "decided",
        "asked",
      ].includes(word),
  );
  if (
    expectedPast &&
    !actual.includes(expectedPast) &&
    !actual.includes("did") &&
    !actual.includes("had")
  ) {
    notes.push(
      `Ngữ pháp: câu tiếng Việt có ý quá khứ, nên cần dạng quá khứ như "${expectedPast}".`,
    );
  }

  const expectedPerfect =
    expected.includes("have") ||
    expected.includes("has") ||
    expected.includes("had");
  if (
    expectedPerfect &&
    !actual.some((word) => ["have", "has", "had"].includes(word))
  ) {
    notes.push(
      `Ngữ pháp: câu này cần cấu trúc hoàn thành với "have/has/had" để diễn tả kinh nghiệm hoặc hành động xảy ra trước một mốc.`,
    );
  }

  const shared = expected.filter((word) => actual.includes(word));
  if (shared.length >= Math.min(5, expected.length - 1)) {
    const expectedSharedOrder = expected
      .filter((word) => actual.includes(word))
      .join(" ");
    const actualSharedOrder = actual
      .filter((word) => expected.includes(word))
      .join(" ");
    if (expectedSharedOrder !== actualSharedOrder) {
      notes.push(
        "Trật tự từ: bạn có nhiều từ đúng, nhưng thứ tự trong câu chưa tự nhiên. Hãy đặt chủ ngữ trước động từ, sau đó đến tân ngữ/trạng ngữ.",
      );
    }
  }

  const lexicalMissing = missing.filter(
    (word) =>
      !articles.has(word) &&
      !beForms.has(word) &&
      !auxiliaries.has(word) &&
      !prepositions.has(word),
  );
  if (lexicalMissing.length) {
    notes.push(
      `Từ vựng: cần thêm hoặc thay bằng "${uniqueShort(lexicalMissing).join(", ")}" để sát nghĩa hơn.`,
    );
  }

  const lexicalExtra = extra.filter(
    (word) =>
      !articles.has(word) && !beForms.has(word) && !auxiliaries.has(word),
  );
  if (lexicalExtra.length && notes.length < 5) {
    notes.push(
      `Từ không khớp: "${uniqueShort(lexicalExtra).join(", ")}" có thể làm câu lệch nghĩa hoặc thừa so với đáp án mẫu.`,
    );
  }

  if (
    actual.some((word) => weakVocabulary.has(word)) &&
    expected.some((word) => !actual.includes(word))
  ) {
    notes.push(
      "Từ vựng: thử dùng từ cụ thể hơn thay vì các từ rất chung như good/bad/thing/get nếu câu cần sắc thái rõ hơn.",
    );
  }

  if (!notes.length) {
    notes.push(
      "Câu của bạn gần đúng về ý. Hãy so sánh với đáp án mẫu để chỉnh lại cách diễn đạt, giới từ hoặc cụm từ cố định.",
    );
  }

  return uniqueShort(notes, 6);
}

function evaluateAnswer() {
  const lesson = currentLesson();
  if (!lesson) {
    showFeedback("close", "Không có câu phù hợp", 0, "Hãy đổi bộ lọc", [
      "Bộ lọc hiện tại không có câu nào. Bạn có thể chọn “Tất cả câu” hoặc đổi cấp độ/chủ đề.",
    ]);
    return;
  }
  if (!state.checkedCurrent && !canPracticeMore()) {
    const plan = activePlan();
    showFeedback("wrong", "Đã hết lượt hôm nay", 0, lesson.answers[0], [
      `Tài khoản ${plan.name} chỉ được luyện tối đa ${plan.dailyLimit} câu/ngày.`,
      "Bạn có thể đăng nhập tài khoản PREMIUM hoặc quay lại vào ngày mai.",
    ]);
    return;
  }
  const answer = els.answerInput.value.trim();
  if (!answer) {
    showFeedback(
      "wrong",
      "Nhập câu tiếng Anh trước đã.",
      0,
      lesson.answers[0],
      ["Bạn chưa nhập câu nào. Hãy thử dịch trọn câu tiếng Việt ở trên."],
    );
    els.answerInput.focus();
    return;
  }

  const match = bestMatch(answer, lesson);
  const isCorrect =
    match.score >= 0.94 ||
    lesson.answers.some((sample) => normalize(sample) === normalize(answer));
  const isClose = !isCorrect && match.score >= 0.72;
  const notes = isCorrect
    ? [
        "Đúng tốt. Nếu muốn tự nhiên hơn, bạn có thể thử một cách diễn đạt khác trong các đáp án mẫu.",
      ]
    : [
        ...detectIssues(match.sample, answer),
        ...buildPremiumAnalysis(match.sample, answer, lesson),
      ];

  if (!state.checkedCurrent) {
    consumePracticeAttempt();
    state.stats.attempts += 1;
    if (isCorrect) {
      state.stats.correct += 1;
      state.stats.streak += 1;
      delete state.stats.weak[lesson.id];
    } else {
      state.stats.streak = 0;
      state.stats.weak[lesson.id] = (state.stats.weak[lesson.id] || 0) + 1;
      if (isClose) state.stats.close += 1;
    }
    state.stats.seen[lesson.id] = true;
    saveStats();
    state.checkedCurrent = true;
  }

  const title = isCorrect ? "Đúng rồi" : isClose ? "Gần đúng" : "Cần sửa";
  showFeedback(
    isCorrect ? "correct" : isClose ? "close" : "wrong",
    title,
    Math.round(match.score * 100),
    match.sample,
    notes,
  );
  addHistory(lesson, answer, match.sample, isCorrect, isClose);
  renderStats();
  renderProgress();
}

function showFeedback(type, title, score, sample, notes) {
  els.feedback.className = `feedback show ${type}`;
  els.feedback.innerHTML = `
        <div class="result-title">
          <span>${title}</span>
          <span class="score-chip">${score}%</span>
        </div>
        <p class="answer-line"><b>Đáp án gợi ý:</b> ${sample}</p>
        <ul class="notes">${notes.map((note) => `<li>${note}</li>`).join("")}</ul>
      `;
}

function showListeningFeedback(type, title, score, sample, notes) {
  els.listeningFeedback.className = `feedback show ${type}`;
  els.listeningFeedback.innerHTML = `
        <div class="result-title">
          <span>${title}</span>
          <span class="score-chip">${score}%</span>
        </div>
        <p class="answer-line"><b>Đáp án nghe:</b> ${sample}</p>
        <ul class="notes">${notes.map((note) => `<li>${note}</li>`).join("")}</ul>
      `;
}

function revealHint() {
  const lesson = currentLesson();
  const sample = lesson.answers[0];
  const words = tokens(sample);
  state.hintCount += 1;
  const hintSize = Math.min(words.length, Math.max(2, state.hintCount + 1));
  const shown = words.slice(0, hintSize).join(" ");
  const notes = [
    `Mở đầu: "${shown}${hintSize < words.length ? " ..." : ""}"`,
    `Trọng tâm: ${lesson.focus}.`,
  ];
  showFeedback(
    "close",
    "Gợi ý",
    Math.round((hintSize / words.length) * 100),
    sample.replace(/[A-Za-z]/g, "_"),
    notes,
  );
  els.answerInput.focus();
}

function currentLesson() {
  if (!state.queue.length) buildQueue();
  return state.queue[state.index] || null;
}

function filteredLessons() {
  const planLessons = lessons.filter(isAllowedByPlan);
  let items = planLessons;
  if (state.level === "weak") {
    const weakIds = Object.keys(state.stats.weak);
    items = planLessons.filter((item) => weakIds.includes(item.id));
    if (!items.length)
      items = planLessons.filter((item) => item.level === "A1");
  } else if (state.level !== "mix") {
    items = planLessons.filter((item) => item.level === state.level);
  }
  if (state.topic !== "all") {
    const topicFiltered = items.filter((item) => item.topic === state.topic);
    if (topicFiltered.length) items = topicFiltered;
  }
  items = applyStudyFilter(items);
  return applyPracticeFilter(items);
}

function applyPracticeFilter(items) {
  if (state.practiceFilter === "unseen") {
    return items.filter((item) => !state.stats.seen[item.id]);
  }
  if (state.practiceFilter === "seen") {
    return items.filter((item) => state.stats.seen[item.id]);
  }
  if (state.practiceFilter === "incorrect") {
    return items.filter((item) => state.stats.weak[item.id]);
  }
  return items;
}

function filteredListeningItems() {
  const planListeningItems = listeningItems.filter(isAllowedByPlan);
  let items = planListeningItems;
  if (state.level === "weak") {
    const weakIds = Object.keys(state.stats.weak);
    items = planListeningItems.filter((item) => weakIds.includes(item.id));
    if (!items.length)
      items = planListeningItems.filter((item) => item.level === "A1");
  } else if (state.level !== "mix") {
    items = planListeningItems.filter((item) => item.level === state.level);
  }
  if (state.topic !== "all") {
    const topicFiltered = items.filter((item) => item.topic === state.topic);
    if (topicFiltered.length) items = topicFiltered;
  }
  items = applyStudyFilter(items);
  return applyPracticeFilter(items);
}

function buildQueue() {
  const items = filteredLessons();
  state.queue = shuffle([...items]);
  state.index = 0;
  state.checkedCurrent = false;
  state.hintCount = 0;
  buildListeningQueue();
}

function buildListeningQueue() {
  const items = filteredListeningItems();
  state.listeningQueue = shuffle([...items]);
  state.listeningIndex = 0;
  state.listeningCurrent = null;
  state.listeningCheckedCurrent = false;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function nextLesson() {
  if (!state.queue.length) buildQueue();
  if (!state.queue.length) {
    renderStudyControls();
    renderLesson();
    return;
  }
  state.index = (state.index + 1) % state.queue.length;
  state.checkedCurrent = false;
  state.hintCount = 0;
  els.answerInput.value = "";
  els.feedback.className = "feedback";
  els.feedback.innerHTML = "";
  renderLesson();
  els.answerInput.focus();
}

function currentListeningItem() {
  if (!state.listeningQueue.length) buildListeningQueue();
  return state.listeningQueue[state.listeningIndex] || null;
}

function startListening(useNext = false) {
  if (
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    showListeningFeedback(
      "wrong",
      "Trình duyệt không hỗ trợ đọc",
      0,
      "Không có âm thanh",
      [
        "Trình duyệt hiện tại không hỗ trợ Web Speech API. Hãy mở file bằng Chrome hoặc Edge để dùng luyện nghe.",
      ],
    );
    return;
  }

  if (useNext || !state.listeningCurrent) {
    state.listeningCurrent = currentListeningItem();
    state.listeningCheckedCurrent = false;
  }

  if (!state.listeningCurrent) {
    showListeningFeedback(
      "close",
      "Không có câu nghe phù hợp",
      0,
      "Hãy đổi bộ lọc",
      [
        "Bộ lọc hiện tại không có câu nghe nào. Bạn có thể chọn “Tất cả câu” hoặc đổi cấp độ/chủ đề.",
      ],
    );
    return;
  }

  els.listeningInput.value = "";
  els.listeningFeedback.className = "feedback";
  els.listeningFeedback.innerHTML = "";
  els.listeningLevelPill.textContent = `${state.listeningCurrent.level} - ${state.listeningCurrent.topic}`;
  els.listeningStatus.textContent =
    "Đang đọc đoạn tiếng Anh. Hãy nghe kỹ rồi nhập lại bên dưới.";
  speakText(state.listeningCurrent.text);
  els.listeningInput.focus();
}

function speakText(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = Number(state.speechRate || 0.75);
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find((voice) => /^en[-_]/i.test(voice.lang));
  if (englishVoice) utterance.voice = englishVoice;
  utterance.onend = () => {
    els.listeningStatus.textContent =
      "Đã đọc xong. Nhập lại câu bạn nghe được rồi bấm kiểm tra.";
  };
  window.speechSynthesis.speak(utterance);
}

function repeatListening() {
  if (!state.listeningCurrent) {
    startListening();
    return;
  }
  els.listeningStatus.textContent = "Đang đọc lại đoạn tiếng Anh.";
  speakText(state.listeningCurrent.text);
  els.listeningInput.focus();
}

function nextListening() {
  if (!state.listeningQueue.length) buildListeningQueue();
  if (!state.listeningQueue.length) {
    showListeningFeedback(
      "close",
      "Không có câu nghe phù hợp",
      0,
      "Hãy đổi bộ lọc",
      ["Bộ lọc hiện tại không có câu nghe nào để chuyển tiếp."],
    );
    return;
  }
  state.listeningIndex =
    (state.listeningIndex + 1) % state.listeningQueue.length;
  state.listeningCurrent = currentListeningItem();
  state.listeningCheckedCurrent = false;
  startListening(true);
}

function checkListeningAnswer() {
  if (!state.listeningCurrent) {
    showListeningFeedback("close", "Chưa có câu nghe", 0, "Bấm bắt đầu nghe", [
      "Bạn cần bấm “Bắt đầu nghe” trước, sau đó nhập lại câu tiếng Anh đã nghe.",
    ]);
    return;
  }
  if (!state.listeningCheckedCurrent && !canPracticeMore()) {
    const plan = activePlan();
    showListeningFeedback(
      "wrong",
      "Đã hết lượt hôm nay",
      0,
      state.listeningCurrent.text,
      [
        `Tài khoản ${plan.name} chỉ được luyện tối đa ${plan.dailyLimit} câu/ngày.`,
        "Bạn có thể đăng nhập tài khoản PREMIUM hoặc quay lại vào ngày mai.",
      ],
    );
    return;
  }

  const answer = els.listeningInput.value.trim();
  if (!answer) {
    showListeningFeedback(
      "wrong",
      "Chưa nhập nội dung nghe",
      0,
      state.listeningCurrent.text,
      [
        "Bạn chưa nhập đoạn nào. Hãy nghe lại rồi gõ câu tiếng Anh bạn nghe được.",
      ],
    );
    els.listeningInput.focus();
    return;
  }

  const score = similarity(state.listeningCurrent.text, answer);
  const isCorrect =
    score >= 0.94 ||
    normalize(state.listeningCurrent.text) === normalize(answer);
  const isClose = !isCorrect && score >= 0.72;
  const notes = isCorrect
    ? ["Bạn nghe và chép lại rất tốt. Có thể bấm câu nghe tiếp để luyện thêm."]
    : [
        ...detectIssues(state.listeningCurrent.text, answer),
        ...buildPremiumAnalysis(
          state.listeningCurrent.text,
          answer,
          state.listeningCurrent,
        ),
      ];
  const title = isCorrect
    ? "Nghe đúng rồi"
    : isClose
      ? "Gần đúng"
      : "Cần nghe lại";

  if (!state.listeningCheckedCurrent) {
    consumePracticeAttempt();
    state.stats.attempts += 1;
    if (isCorrect) {
      state.stats.correct += 1;
      state.stats.streak += 1;
      delete state.stats.weak[state.listeningCurrent.id];
    } else {
      state.stats.streak = 0;
      state.stats.weak[state.listeningCurrent.id] =
        (state.stats.weak[state.listeningCurrent.id] || 0) + 1;
      if (isClose) state.stats.close += 1;
    }
    state.stats.seen[state.listeningCurrent.id] = true;
    saveStats();
    state.listeningCheckedCurrent = true;
  }

  showListeningFeedback(
    isCorrect ? "correct" : isClose ? "close" : "wrong",
    title,
    Math.round(score * 100),
    state.listeningCurrent.text,
    notes,
  );
  addHistory(
    {
      id: state.listeningCurrent.id,
      level: state.listeningCurrent.level,
      topic: `Nghe - ${state.listeningCurrent.topic}`,
      vi: state.listeningCurrent.text,
      answers: [state.listeningCurrent.text],
    },
    answer,
    state.listeningCurrent.text,
    isCorrect,
    isClose,
  );
  renderStats();
  renderProgress();
}

function renderLesson() {
  const lesson = currentLesson();
  if (!lesson) {
    els.levelPill.textContent = state.level.toUpperCase();
    els.topicPill.textContent =
      state.topic === "all" ? "Tất cả chủ đề" : state.topic;
    els.indexPill.textContent = "0/0";
    els.vietnamesePrompt.textContent =
      "Không có câu phù hợp với bộ lọc hiện tại.";
    renderProgress();
    return;
  }
  els.levelPill.textContent = lesson.level;
  els.topicPill.textContent = lesson.topic;
  els.indexPill.textContent = `${state.index + 1}/${state.queue.length}`;
  els.vietnamesePrompt.textContent = lesson.vi;
  renderProgress();
}

function renderTopics() {
  const topics = [
    ...new Set(lessons.filter(isAllowedByPlan).map((item) => item.topic)),
  ].sort();
  els.topicSelect.innerHTML =
    `<option value="all">Tất cả</option>` +
    topics
      .map((topic) => `<option value="${topic}">${topic}</option>`)
      .join("");
  if (state.topic !== "all" && !topics.includes(state.topic))
    state.topic = "all";
  els.topicSelect.value = state.topic;
}

function renderGrammarOptions() {
  const available = new Set(lessons.filter(isAllowedByPlan).map(grammarKey));
  const preferredOrder = [
    ...grammarGroups.map((group) => group.label),
    "Ngữ pháp và mẫu câu khác",
  ];
  const options = preferredOrder.filter((label) => available.has(label));
  els.grammarSelect.innerHTML =
    `<option value="all">Tất cả ngữ pháp</option>` +
    options
      .map(
        (focus) =>
          `<option value="${escapeHtml(focus)}">${escapeHtml(focus)}</option>`,
      )
      .join("");
  if (state.grammarFocus !== "all" && !options.includes(state.grammarFocus))
    state.grammarFocus = "all";
  els.grammarSelect.value = state.grammarFocus;
}

function renderStudyControls() {
  els.studyModeSelect.value = state.studyMode;
  els.vocabularyInput.value = state.vocabularyQuery;
  els.vocabularyFilterWrap.classList.toggle(
    "show",
    state.studyMode === "vocabulary",
  );
  els.grammarFilterWrap.classList.toggle("show", state.studyMode === "grammar");
  const count = filteredLessons().length;
  if (state.studyMode === "vocabulary") {
    els.studyFilterStatus.textContent = state.vocabularyQuery.trim()
      ? `${count} Câu có từ "${state.vocabularyQuery.trim()}"`
      : "Nhập từ tiếng Anh mà bạn muốn học";
  } else if (state.studyMode === "grammar") {
    els.studyFilterStatus.textContent =
      state.grammarFocus === "all"
        ? `${count} câu trong tất cả ngữ pháp.`
        : `${count} câu theo ngữ pháp đã chọn.`;
  } else {
    els.studyFilterStatus.textContent = "";
  }
}

function renderStats() {
  const attempts = state.stats.attempts || 0;
  const accuracy = attempts
    ? Math.round((state.stats.correct / attempts) * 100)
    : 0;
  els.doneStat.textContent = attempts;
  els.accuracyStat.textContent = `${accuracy}%`;
  els.streakStat.textContent = state.stats.streak || 0;

  const levels = ["A1", "A2", "B1", "B2"];
  els.levelList.innerHTML = levels
    .map((level) => {
      const locked = !activePlan().levels.includes(level);
      const total = lessons.filter(
        (item) => item.level === level && isAllowedByPlan(item),
      ).length;
      const seen = lessons.filter(
        (item) => item.level === level && state.stats.seen[item.id],
      ).length;
      return `
          <div class="level-item">
            <div class="level-tag">${level}</div>
            <div><b>${locked ? "Khóa" : `${seen}/${total} câu`}</b><span>${locked ? "cần PREMIUM" : levelText(level)}</span></div>
            <span class="mini">${locked || !total ? "0%" : `${Math.round((seen / total) * 100)}%`}</span>
          </div>
        `;
    })
    .join("");
}

function levelText(level) {
  return {
    A1: "cơ bản, câu ngắn",
    A2: "quá khứ, kế hoạch",
    B1: "nói ý kiến, liên kết",
    B2: "học thuật, sắc thái",
  }[level];
}

function renderProgress() {
  const items = filteredLessons();
  const seen = items.filter((item) => state.stats.seen[item.id]).length;
  const percent = items.length ? Math.round((seen / items.length) * 100) : 0;
  els.progressText.textContent = `${seen}/${items.length} câu trong bộ hiện tại.`;
  els.progressFill.style.width = `${percent}%`;
}

function addHistory(lesson, answer, sample, correct, close) {
  state.history.unshift({ lesson, answer, sample, correct, close });
  state.history = state.history.slice(0, 8);
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    els.historyList.innerHTML = `<div class="empty">Chưa có câu nào được chấm.</div>`;
    return;
  }
  els.historyList.innerHTML = state.history
    .map(
      (item) => `
        <div class="history-item">
          <b>${item.correct ? "Đúng" : item.close ? "Gần đúng" : "Sai"} - ${item.lesson.level} - ${item.lesson.topic}</b>
          <span>${item.lesson.vi}</span>
          <span>${item.answer}</span>
        </div>
      `,
    )
    .join("");
}

function saveStats() {
  localStorage.setItem("englishTrainerStats", JSON.stringify(state.stats));
}

function login() {
  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value;
  const user = getUsers().find(
    (item) => item.username === username && item.password === password,
  );
  if (!user) {
    els.accountStatus.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
    return;
  }
  setCurrentUser(user);
  els.passwordInput.value = "";
  refreshAfterAccountChange();
}

function registerFreeAccount() {
  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value;
  if (!username || !password) {
    els.accountStatus.textContent =
      "Nhập tên đăng nhập và mật khẩu để đăng ký.";
    return;
  }
  const users = getUsers();
  if (users.some((user) => user.username === username)) {
    els.accountStatus.textContent = "Tên đăng nhập này đã tồn tại.";
    return;
  }
  const user = { username, password, plan: "FREE" };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  els.passwordInput.value = "";
  refreshAfterAccountChange();
}

function logout() {
  setCurrentUser(null);
  refreshAfterAccountChange();
}

function refreshAfterAccountChange() {
  refreshLessonCollections();
  if (
    !activePlan().levels.includes(state.level) &&
    state.level !== "mix" &&
    state.level !== "weak"
  ) {
    state.level = "A1";
    document.querySelectorAll("[data-level]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.level === "A1");
    });
  }
  buildQueue();
  els.answerInput.value = "";
  els.listeningInput.value = "";
  els.feedback.className = "feedback";
  els.feedback.innerHTML = "";
  els.listeningFeedback.className = "feedback";
  els.listeningFeedback.innerHTML = "";
  renderAll();
}

function renderAccount() {
  const user = activeUser();
  const plan = activePlan();
  const usage = usageForActiveUser();
  const usageText =
    plan.dailyLimit === Infinity
      ? "Không giới hạn"
      : `${usage.practice}/${plan.dailyLimit} câu hôm nay`;
  const customText =
    plan.customLimit === Infinity
      ? "Không giới hạn câu tự thêm"
      : `${customLessonsForActiveUser().length}/${plan.customLimit} câu tự thêm`;

  if (state.currentUser) {
    els.accountStatus.innerHTML = `<b>${user.username}</b> - gói ${plan.name}`;
    els.authForm.style.display = "none";
    els.sessionActions.style.display = "grid";
  } else {
    els.accountStatus.innerHTML = `<b>Khách</b> - quyền FREE tạm thời. Đăng nhập để lưu tài khoản rõ ràng hơn.`;
    els.authForm.style.display = "grid";
    els.sessionActions.style.display = "none";
  }

  els.planStatus.textContent = `${plan.name}: ${usageText}. ${customText}. ${plan.advancedAnalysis ? "Có phân tích lỗi nâng cao." : "Chỉ A1-A2 và phân tích cơ bản."}`;
  document.querySelectorAll("[data-level]").forEach((button) => {
    const locked =
      ["A1", "A2", "B1", "B2"].includes(button.dataset.level) &&
      !plan.levels.includes(button.dataset.level);
    button.disabled = locked;
    button.title = locked ? "Cần PREMIUM để mở cấp độ này" : "";
  });
}

async function showUpgradeInfo() {
  const packages = paymentConfig.packages
    .map((pack) => `${pack.label}: ${pack.price.toLocaleString("vi-VN")}đ`)
    .join(" | ");
  const preview = await window.EnglishTrainerServices.createPayOSCheckout(
    "premium_1m",
    activeUser(),
  );
  alert(
    `PREMIUM mở khóa B1-B2, luyện không giới hạn và phân tích lỗi nâng cao.\n\nGói: ${packages}\n\nThanh toán sau này: ${paymentConfig.method}. Code đã chuẩn bị cấu hình PayOS trong paymentConfig để nối backend tạo link/VietQR.`,
  );
  console.info("PayOS integration placeholder:", preview);
}

function addCustomLesson() {
  const english = els.customEnglishInput.value.trim();
  const vietnamese = els.customVietnameseInput.value.trim();
  const topic = els.customTopicInput.value.trim() || "Câu của tôi";
  const level = els.customLevelSelect.value || "A2";

  if (!english) {
    els.customStatus.textContent = "Bạn cần nhập câu tiếng Anh trước.";
    els.customEnglishInput.focus();
    return;
  }
  if (!canAddCustomLesson()) {
    const plan = activePlan();
    els.customStatus.textContent = `Tài khoản ${plan.name} đã đạt giới hạn ${plan.customLimit} câu tự thêm.`;
    return;
  }
  if (!canAddCustomToday()) {
    const plan = activePlan();
    els.customStatus.textContent = `Tài khoản ${plan.name} chỉ được thêm tối đa ${plan.customDailyLimit} câu/ngày.`;
    return;
  }

  const customLesson = normalizeLessonRecord({
    id: `custom-${Date.now()}`,
    level,
    topic,
    vi: vietnamese || english,
    answers: [english],
    focus: "câu do bạn tự thêm",
    source: "custom",
    owner: activeUser().username,
  });

  customLessons.push(customLesson);
  saveCustomLessons();
  consumeCustomAdd();
  refreshLessonCollections();
  buildQueue();
  renderAll();

  els.customEnglishInput.value = "";
  els.customVietnameseInput.value = "";
  els.customTopicInput.value = "";
  els.customStatus.textContent = `Đã thêm câu mới vào kho. Tổng kho hiện có ${lessons.length} câu.`;
  els.customEnglishInput.focus();
}

function resetStats() {
  if (!confirm("Xóa toàn bộ tiến độ và điểm hiện tại?")) return;
  state.stats = { ...defaultStats, seen: {}, weak: {} };
  state.history = [];
  saveStats();
  buildQueue();
  renderAll();
  els.answerInput.value = "";
  els.feedback.className = "feedback";
  els.feedback.innerHTML = "";
}

function renderAll() {
  renderAccount();
  els.practiceFilterSelect.value = state.practiceFilter;
  els.speechRateSelect.value = state.speechRate;
  const customLimit =
    activePlan().customLimit === Infinity
      ? "không giới hạn"
      : activePlan().customLimit;
  els.customStatus.textContent = `Kho hiện có ${lessons.filter(isAllowedByPlan).length} câu theo gói của bạn. Câu tự thêm: ${customLessonsForActiveUser().length}/${customLimit}.`;
  renderTopics();
  renderGrammarOptions();
  renderStudyControls();
  renderLesson();
  renderStats();
  renderHistory();
}

function resetPracticeView() {
  buildQueue();
  els.answerInput.value = "";
  els.listeningInput.value = "";
  els.feedback.className = "feedback";
  els.feedback.innerHTML = "";
  els.listeningFeedback.className = "feedback";
  els.listeningFeedback.innerHTML = "";
  els.listeningStatus.textContent = "Sẵn sàng phát câu nghe đầu tiên.";
  renderStudyControls();
  renderLesson();
}

function setAccountMenu(open) {
  els.accountMenuPanel.classList.toggle("open", open);
  els.accountMenuBtn.setAttribute("aria-expanded", String(open));
}

function switchLevelToMix() {
  if (state.level === "mix") return;
  state.level = "mix";
  document.querySelectorAll("[data-level]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.level === "mix");
  });
}

document.querySelectorAll("[data-level]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) {
      alert("Cấp độ này cần tài khoản PREMIUM.");
      return;
    }
    document
      .querySelectorAll("[data-level]")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    state.level = button.dataset.level;
    buildQueue();
    els.answerInput.value = "";
    els.listeningInput.value = "";
    els.feedback.className = "feedback";
    els.feedback.innerHTML = "";
    els.listeningFeedback.className = "feedback";
    els.listeningFeedback.innerHTML = "";
    els.listeningStatus.textContent = "Sẵn sàng phát câu nghe đầu tiên.";
    renderLesson();
  });
});

els.topicSelect.addEventListener("change", () => {
  state.topic = els.topicSelect.value;
  switchLevelToMix();
  buildQueue();
  els.answerInput.value = "";
  els.listeningInput.value = "";
  els.feedback.className = "feedback";
  els.feedback.innerHTML = "";
  els.listeningFeedback.className = "feedback";
  els.listeningFeedback.innerHTML = "";
  els.listeningStatus.textContent = "Sẵn sàng phát câu nghe đầu tiên.";
  renderStudyControls();
  renderLesson();
});

els.studyModeSelect.addEventListener("change", () => {
  state.studyMode = els.studyModeSelect.value;
  localStorage.setItem("englishTrainerStudyMode", state.studyMode);
  switchLevelToMix();
  resetPracticeView();
  if (state.studyMode === "vocabulary") els.vocabularyInput.focus();
});

els.vocabularyInput.addEventListener("input", () => {
  state.vocabularyQuery = els.vocabularyInput.value;
  localStorage.setItem("englishTrainerVocabularyQuery", state.vocabularyQuery);
  if (state.vocabularyQuery.trim()) switchLevelToMix();
  resetPracticeView();
});

els.grammarSelect.addEventListener("change", () => {
  state.grammarFocus = els.grammarSelect.value;
  localStorage.setItem("englishTrainerGrammarFocus", state.grammarFocus);
  switchLevelToMix();
  resetPracticeView();
});

els.practiceFilterSelect.addEventListener("change", () => {
  state.practiceFilter = els.practiceFilterSelect.value;
  localStorage.setItem("englishTrainerPracticeFilter", state.practiceFilter);
  switchLevelToMix();
  buildQueue();
  els.answerInput.value = "";
  els.listeningInput.value = "";
  els.feedback.className = "feedback";
  els.feedback.innerHTML = "";
  els.listeningFeedback.className = "feedback";
  els.listeningFeedback.innerHTML = "";
  els.listeningStatus.textContent = "Sẵn sàng phát câu nghe đầu tiên.";
  renderLesson();
});

els.speechRateSelect.addEventListener("change", () => {
  state.speechRate = els.speechRateSelect.value;
  localStorage.setItem("englishTrainerSpeechRate", state.speechRate);
  if (state.listeningCurrent && window.speechSynthesis.speaking) {
    repeatListening();
  }
});

els.checkBtn.addEventListener("click", evaluateAnswer);
els.hintBtn.addEventListener("click", revealHint);
els.nextBtn.addEventListener("click", nextLesson);
els.resetBtn.addEventListener("click", resetStats);
els.addCustomBtn.addEventListener("click", addCustomLesson);
els.translateBtn.addEventListener("click", translateMiniText);
els.translatorInput.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    translateMiniText();
  }
});
els.loginBtn.addEventListener("click", login);
els.registerBtn.addEventListener("click", registerFreeAccount);
els.logoutBtn.addEventListener("click", logout);
els.upgradeInfoBtn.addEventListener("click", showUpgradeInfo);
els.accountMenuBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  setAccountMenu(!els.accountMenuPanel.classList.contains("open"));
});
els.accountMenuPanel.addEventListener("click", (event) => {
  event.stopPropagation();
});
document.addEventListener("click", () => {
  setAccountMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setAccountMenu(false);
});
els.startListeningBtn.addEventListener("click", () => startListening());
els.repeatListeningBtn.addEventListener("click", repeatListening);
els.checkListeningBtn.addEventListener("click", checkListeningAnswer);
els.nextListeningBtn.addEventListener("click", nextListening);
els.answerInput.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    evaluateAnswer();
  }
});
els.listeningInput.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    checkListeningAnswer();
  }
});

getUsers();
refreshLessonCollections();
buildQueue();
renderAll();
els.answerInput.focus();
