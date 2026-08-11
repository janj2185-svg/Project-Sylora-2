/**
 * Learning Hub + Science Workspace foundations (218–237).
 * Tutor scaffolds learning; does not silently do graded work.
 * No fake AI cheating detector. Citations must not invent DOIs.
 */

import { randomUUID } from 'node:crypto';

const createId = (prefix = 'id') => `${prefix}_${randomUUID()}`;

export const LEARNING_HUB_SECTIONS = Object.freeze([
  "courses",
  "lessons",
  "study",
  "assignments",
  "tests",
  "notes",
  "flashcards",
  "study_rooms",
  "calendar",
  "progress",
  "library",
  "sylora_tutor"
]);

export const SCIENCE_HUB_SECTIONS = Object.freeze([
  "discover",
  "papers",
  "research",
  "datasets",
  "experiments",
  "labs",
  "science_circles",
  "institutions",
  "researchers",
  "conferences",
  "library",
  "sylora_research"
]);

export const TUTOR_MODES = Object.freeze(["explain", "teach_me", "practice", "quiz_me", "exam_preparation"]);

export function createTutorSession({
  userId,
  subject = "",
  mode = "explain",
  level = "unknown",
  proactive = false
} = {}) {
  const m = TUTOR_MODES.includes(mode) ? mode : "explain";
  return {
    id: createId("tutor"),
    userId,
    subject: String(subject || "").slice(0, 200),
    mode: m,
    level,
    proactiveAssistance: Boolean(proactive),
    principles: {
      noReadyAnswerByDefault: true,
      explainThenQuestion: true,
      hintsBeforeSolution: true,
      adaptDifficulty: true,
      checkUnderstanding: true
    },
    steps: [
      "assess_level",
      "explain",
      "ask_question",
      "hint_if_needed",
      "check",
      "explain_errors",
      "adapt"
    ],
    createdAt: new Date().toISOString()
  };
}

export function tutorResponsePolicy({ gradedAssignment = false } = {}) {
  return {
    canExplain: true,
    canHint: true,
    canQuiz: true,
    canCompleteGradedWorkSilently: false,
    gradedAssignment: Boolean(gradedAssignment),
    note: gradedAssignment
      ? "Sylora may help the student understand the assignment but must not silently complete graded work for them."
      : "Tutor scaffolds learning rather than dumping final answers."
  };
}

export function createFlashcardDeck({ title = "", cards = [], sourceMaterialId = null, aiAssisted = false } = {}) {
  return {
    id: createId("deck"),
    title: String(title || "Deck").slice(0, 200),
    sourceMaterialId,
    aiAssisted: Boolean(aiAssisted),
    accuracyCriticalNote: aiAssisted
      ? "AI-assisted cards require user review where accuracy is critical."
      : null,
    cards: (cards || []).map((c, i) => ({
      id: c.id || createId("card"),
      front: String(c.front || "").slice(0, 2000),
      back: String(c.back || "").slice(0, 4000),
      intervalDays: c.intervalDays ?? 1,
      ease: c.ease ?? 2.5,
      dueAt: c.dueAt || new Date().toISOString(),
      order: i
    })),
    spacedRepetition: true,
    createdAt: new Date().toISOString()
  };
}

export function scheduleFlashcardReview(card, { quality = 3 } = {}) {
  const q = Math.max(0, Math.min(5, Number(quality) || 3));
  let interval = Number(card.intervalDays) || 1;
  let ease = Number(card.ease) || 2.5;
  if (q < 3) {
    interval = 1;
  } else {
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    interval = Math.max(1, Math.round(interval * ease));
  }
  const due = new Date(Date.now() + interval * 86400000).toISOString();
  return { ...card, intervalDays: interval, ease, dueAt: due, lastQuality: q };
}

export function createExamPlan({ subject = "", examDate, availableMinutesPerDay = 60 } = {}) {
  const exam = examDate ? new Date(examDate) : new Date(Date.now() + 14 * 86400000);
  const days = Math.max(1, Math.ceil((exam.getTime() - Date.now()) / 86400000));
  const daily = Math.max(15, Number(availableMinutesPerDay) || 60);
  return {
    id: createId("exam-plan"),
    subject: String(subject || "").slice(0, 200),
    examDate: exam.toISOString().slice(0, 10),
    daysRemaining: days,
    availableMinutesPerDay: daily,
    phases: [
      { name: "diagnose", days: Math.min(2, days) },
      { name: "core_review", days: Math.max(1, Math.floor(days * 0.5)) },
      { name: "practice", days: Math.max(1, Math.floor(days * 0.3)) },
      { name: "final_pass", days: Math.max(1, days - Math.floor(days * 0.8)) }
    ],
    adaptive: true,
    createdAt: new Date().toISOString()
  };
}

export function createAssignment({
  title = "",
  instructions = "",
  deadline = null,
  materials = [],
  classId = null,
  teacherId = null
} = {}) {
  return {
    id: createId("assign"),
    title: String(title || "Assignment").slice(0, 200),
    instructions: String(instructions || "").slice(0, 8000),
    materials: materials || [],
    deadline,
    classId,
    teacherId,
    submissions: [],
    status: "open",
    syloraHelpPolicy: tutorResponsePolicy({ gradedAssignment: true }),
    createdAt: new Date().toISOString()
  };
}

export function createQuizBuilder({
  title = "",
  questions = [],
  timerSeconds = null,
  randomizeOrder = false,
  bankId = null
} = {}) {
  return {
    id: createId("quiz-build"),
    title: String(title || "Quiz").slice(0, 200),
    questions: (questions || []).map((q, i) => ({
      id: q.id || createId("q"),
      type: ["multiple_choice", "open", "true_false", "matching", "numeric"].includes(q.type)
        ? q.type
        : "multiple_choice",
      prompt: String(q.prompt || "").slice(0, 2000),
      options: q.options || [],
      answer: q.answer ?? null,
      order: i
    })),
    timerSeconds: timerSeconds == null ? null : Number(timerSeconds),
    randomizeOrder: Boolean(randomizeOrder),
    questionBankId: bankId,
    examIntegrity: {
      fakeAiCheatingDetector: false,
      transparentRulesOnly: true,
      note: "No claim that AI can reliably detect who wrote text. Controlled assessments use transparent rules."
    },
    createdAt: new Date().toISOString()
  };
}

export function createSmartNote({ title = "", body = "", attachments = [] } = {}) {
  return {
    id: createId("smart-note"),
    title: String(title || "Note").slice(0, 200),
    body: String(body || ""),
    attachments: attachments || [],
    supports: ["text", "images", "drawings", "formulas", "voice", "files"],
    syloraActions: ["summarize", "structure", "flashcards", "quiz", "explain", "translate"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createWhiteboardSession({ space = "learning", title = "" } = {}) {
  return {
    id: createId("board"),
    title: String(title || "Whiteboard").slice(0, 200),
    space,
    tools: ["text", "pen", "shapes", "images", "sticky_notes", "diagrams"],
    objects: [],
    collaborative: true,
    createdAt: new Date().toISOString()
  };
}

export function createResearchLibraryItem({
  type = "paper",
  title = "",
  authors = [],
  doi = null,
  url = null,
  tags = [],
  folderId = null
} = {}) {
  const allowed = new Set(["paper", "book", "dataset", "note", "link"]);
  return {
    id: createId("lib-item"),
    type: allowed.has(type) ? type : "note",
    title: String(title || "Untitled").slice(0, 500),
    authors: Array.isArray(authors) ? authors : [],
    doi: doi || null,
    url: url || null,
    tags: tags || [],
    folderId,
    doNotInventMetadata: true,
    createdAt: new Date().toISOString()
  };
}

export function createPaperReaderView({ paperId, title = "", abstract = "" } = {}) {
  return {
    id: createId("paper-view"),
    paperId,
    title,
    sections: {
      summary: null,
      keyFindings: [],
      methods: null,
      limitations: null,
      definitions: [],
      figures: [],
      references: []
    },
    abstract: String(abstract || "").slice(0, 8000),
    askSylora: true,
    fidelityNote: "Do not distort the paper's conclusions. Mark claim kinds honestly.",
    createdAt: new Date().toISOString()
  };
}

export function createCitation({
  style = "apa",
  title = "",
  authors = [],
  year = null,
  doi = null,
  sourceVerified = false
} = {}) {
  if (!sourceVerified && doi) {
    // Refuse invented DOIs — require verified flag
    return {
      id: createId("cite"),
      error: "doi_not_verified",
      note: "Do not invent DOI, authors, or publication data. Provide verified source metadata."
    };
  }
  return {
    id: createId("cite"),
    style: ["apa", "mla", "chicago", "harvard", "ieee", "vancouver"].includes(style) ? style : "apa",
    title: String(title || "").slice(0, 500),
    authors: authors || [],
    year,
    doi: doi || null,
    sourceVerified: Boolean(sourceVerified),
    createdAt: new Date().toISOString()
  };
}

export function createResearchProject({
  title = "",
  hypothesis = "",
  ownerId = null,
  team = []
} = {}) {
  return {
    id: createId("research"),
    title: String(title || "Research project").slice(0, 200),
    hypothesis: String(hypothesis || "").slice(0, 4000),
    ownerId,
    team: team || [],
    protocol: null,
    literature: [],
    data: [],
    notes: [],
    tasks: [],
    timeline: [],
    meetings: [],
    results: [],
    permissions: { teamCanEdit: true, public: false },
    createdAt: new Date().toISOString()
  };
}

export function createDatasetWorkspace({
  name = "",
  columns = [],
  rowCount = 0,
  previewRows = []
} = {}) {
  return {
    id: createId("dataset"),
    name: String(name || "Dataset").slice(0, 200),
    columns: (columns || []).map((c) => ({
      name: c.name || c,
      type: c.type || "unknown",
      description: c.description || ""
    })),
    rowCount: Number(rowCount) || 0,
    previewRows: (previewRows || []).slice(0, 50),
    analysis: { charts: [], notes: [] },
    basicAnalysisOnly: true,
    createdAt: new Date().toISOString()
  };
}

export function languageTutorMode({ targetLanguage = "en", nativeLanguage = "uk" } = {}) {
  return {
    id: createId("lang-tutor"),
    targetLanguage,
    nativeLanguage,
    activities: ["conversation", "pronunciation", "vocabulary", "grammar", "listening", "roleplay"],
    speakTargetLanguage: true,
    qualityVoiceRequired: true,
    createdAt: new Date().toISOString()
  };
}
