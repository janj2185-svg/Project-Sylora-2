/**
 * Science tools foundations (238–244): Experiment Log, calculators,
 * formula/stats/viz frameworks, collaboration matching, peer discussion.
 */

import { randomUUID } from 'node:crypto';

const id = (p) => `${p}_${randomUUID()}`;

/** Immutable experiment log — edits create new versions; history never silently rewritten. */
export function createExperimentLog({
  researcherId,
  title = '',
  procedure = '',
  parameters = {},
  observations = '',
  files = [],
  results = ''
} = {}) {
  const experimentId = id('exp');
  const version = {
    version: 1,
    date: new Date().toISOString().slice(0, 10),
    researcherId,
    procedure: String(procedure || '').slice(0, 20000),
    parameters: { ...parameters },
    observations: String(observations || '').slice(0, 20000),
    files: (files || []).slice(0, 50),
    results: String(results || '').slice(0, 20000),
    createdAt: new Date().toISOString(),
    immutable: true
  };
  return {
    id: experimentId,
    title: String(title || 'Experiment').slice(0, 200),
    researcherId,
    currentVersion: 1,
    versions: [version],
    appendOnlyHistory: true,
    note: 'Historical versions cannot be silently overwritten. Updates append a new version.',
    createdAt: version.createdAt,
    updatedAt: version.createdAt
  };
}

export function appendExperimentVersion(log, patch = {}, researcherId) {
  if (!log?.versions?.length) throw new Error('EXPERIMENT_NOT_FOUND');
  const prev = log.versions[log.versions.length - 1];
  // Freeze previous — mark immutable explicitly
  prev.immutable = true;
  const nextVer = prev.version + 1;
  const next = {
    version: nextVer,
    date: patch.date || new Date().toISOString().slice(0, 10),
    researcherId: researcherId || prev.researcherId,
    procedure: patch.procedure != null ? String(patch.procedure).slice(0, 20000) : prev.procedure,
    parameters: patch.parameters != null ? { ...patch.parameters } : { ...prev.parameters },
    observations: patch.observations != null ? String(patch.observations).slice(0, 20000) : prev.observations,
    files: patch.files != null ? (patch.files || []).slice(0, 50) : [...(prev.files || [])],
    results: patch.results != null ? String(patch.results).slice(0, 20000) : prev.results,
    createdAt: new Date().toISOString(),
    immutable: true,
    supersedes: prev.version
  };
  log.versions.push(next);
  log.currentVersion = nextVer;
  log.updatedAt = next.createdAt;
  return log;
}

/** Refuse in-place mutation of historical versions. */
export function mutateExperimentVersion(log, versionNumber, _patch) {
  const v = log.versions.find(x => x.version === versionNumber);
  if (!v) throw new Error('VERSION_NOT_FOUND');
  return {
    ok: false,
    error: 'IMMUTABLE_VERSION',
    note: 'Cannot silently rewrite historical experiment records. Use appendExperimentVersion.',
    version: versionNumber
  };
}

export const CALCULATOR_MODULES = Object.freeze([
  {
    id: 'mathematics',
    ops: ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt'],
    units: [],
    assumptions: ['Real numbers unless specified', 'Division by zero undefined']
  },
  {
    id: 'physics',
    ops: ['kinetic_energy', 'force', 'ohm'],
    units: ['J', 'N', 'V', 'A', 'Ω', 'm', 's', 'kg'],
    assumptions: ['Classical mechanics unless relativistic flag set', 'SI units default']
  },
  {
    id: 'chemistry',
    ops: ['moles', 'molarity'],
    units: ['mol', 'L', 'g', 'M'],
    assumptions: ['Ideal solution unless noted', 'Molar mass must be provided by user']
  },
  {
    id: 'statistics',
    ops: ['mean', 'variance', 'stdev', 'correlation_pearson'],
    units: [],
    assumptions: ['Sample vs population must be stated', 'Independence assumed unless noted']
  },
  {
    id: 'engineering',
    ops: ['stress', 'ohms_law_power'],
    units: ['Pa', 'N', 'm²', 'W'],
    assumptions: ['Linear elastic material for stress = F/A unless noted']
  }
]);

export function listCalculators() {
  return CALCULATOR_MODULES.map(m => ({
    id: m.id,
    ops: m.ops,
    units: m.units,
    assumptions: m.assumptions,
    framework: 'modular_calculator_v1',
    note: 'Not one monolithic calculator — load modules on demand.'
  }));
}

export function runCalculator(moduleId, op, inputs = {}) {
  const mod = CALCULATOR_MODULES.find(m => m.id === moduleId);
  if (!mod) throw new Error('UNKNOWN_CALCULATOR_MODULE');
  if (!mod.ops.includes(op)) throw new Error('UNKNOWN_OP');

  const num = (...keys) => keys.map(k => Number(inputs[k]));
  let value = null;
  let unit = inputs.unit || null;
  let steps = [];

  switch (`${moduleId}:${op}`) {
    case 'mathematics:add': {
      const [a, b] = num('a', 'b'); value = a + b; steps = [`${a} + ${b}`]; break;
    }
    case 'mathematics:subtract': {
      const [a, b] = num('a', 'b'); value = a - b; steps = [`${a} - ${b}`]; break;
    }
    case 'mathematics:multiply': {
      const [a, b] = num('a', 'b'); value = a * b; steps = [`${a} × ${b}`]; break;
    }
    case 'mathematics:divide': {
      const [a, b] = num('a', 'b');
      if (b === 0) throw new Error('DIVISION_BY_ZERO');
      value = a / b; steps = [`${a} ÷ ${b}`]; break;
    }
    case 'mathematics:power': {
      const [a, b] = num('a', 'b'); value = a ** b; steps = [`${a}^${b}`]; break;
    }
    case 'mathematics:sqrt': {
      const [a] = num('a');
      if (a < 0) throw new Error('SQRT_NEGATIVE');
      value = Math.sqrt(a); steps = [`√${a}`]; break;
    }
    case 'physics:kinetic_energy': {
      const [m, v] = num('mass', 'velocity');
      value = 0.5 * m * v * v; unit = unit || 'J';
      steps = ['KE = ½·m·v²', `½·${m}·${v}²`]; break;
    }
    case 'physics:force': {
      const [m, a] = num('mass', 'acceleration');
      value = m * a; unit = unit || 'N';
      steps = ['F = m·a']; break;
    }
    case 'physics:ohm': {
      const [i, r] = num('current', 'resistance');
      value = i * r; unit = unit || 'V';
      steps = ['V = I·R']; break;
    }
    case 'chemistry:moles': {
      const [mass, mm] = num('mass', 'molarMass');
      if (!mm) throw new Error('MOLAR_MASS_REQUIRED');
      value = mass / mm; unit = unit || 'mol';
      steps = ['n = m / M']; break;
    }
    case 'chemistry:molarity': {
      const [moles, liters] = num('moles', 'liters');
      if (!liters) throw new Error('VOLUME_REQUIRED');
      value = moles / liters; unit = unit || 'M';
      steps = ['c = n / V']; break;
    }
    case 'statistics:mean': {
      const data = asArray(inputs.data);
      value = mean(data); steps = ['mean = Σx / n']; break;
    }
    case 'statistics:variance': {
      const data = asArray(inputs.data);
      const sample = inputs.sample !== false;
      value = variance(data, sample); steps = [sample ? 'sample variance (n-1)' : 'population variance']; break;
    }
    case 'statistics:stdev': {
      const data = asArray(inputs.data);
      value = Math.sqrt(variance(data, inputs.sample !== false));
      steps = ['stdev = √variance']; break;
    }
    case 'statistics:correlation_pearson': {
      value = pearson(asArray(inputs.x), asArray(inputs.y));
      steps = ['Pearson r']; break;
    }
    case 'engineering:stress': {
      const [f, area] = num('force', 'area');
      if (!area) throw new Error('AREA_REQUIRED');
      value = f / area; unit = unit || 'Pa';
      steps = ['σ = F / A', 'Linear elastic assumption unless noted']; break;
    }
    case 'engineering:ohms_law_power': {
      const [v, i] = num('voltage', 'current');
      value = v * i; unit = unit || 'W';
      steps = ['P = V·I']; break;
    }
    default:
      throw new Error('OP_NOT_IMPLEMENTED');
  }

  if (!Number.isFinite(value)) throw new Error('NON_FINITE_RESULT');
  return {
    moduleId,
    op,
    value: roundSmart(value),
    unit,
    assumptions: mod.assumptions,
    steps,
    inputs,
    framework: 'modular_calculator_v1'
  };
}

function asArray(v) {
  if (!Array.isArray(v) || !v.length) throw new Error('DATA_REQUIRED');
  return v.map(Number);
}
function mean(data) { return data.reduce((s, x) => s + x, 0) / data.length; }
function variance(data, sample = true) {
  const m = mean(data);
  const denom = sample ? data.length - 1 : data.length;
  if (denom <= 0) throw new Error('INSUFFICIENT_DATA');
  return data.reduce((s, x) => s + (x - m) ** 2, 0) / denom;
}
function pearson(x, y) {
  if (x.length !== y.length || x.length < 2) throw new Error('PAIR_DATA_REQUIRED');
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (!dx || !dy) throw new Error('ZERO_VARIANCE');
  return num / Math.sqrt(dx * dy);
}
function roundSmart(n) {
  return Math.round(n * 1e10) / 1e10;
}

export function createFormulaWorkspace({ title = '', latex = '', units = [], ownerId = null } = {}) {
  return {
    id: id('formula'),
    title: String(title || 'Formula').slice(0, 200),
    ownerId,
    latex: String(latex || '').slice(0, 8000),
    equations: [],
    units: units || [],
    plots: [],
    symbolic: {
      supported: false,
      status: 'setup_required',
      note: 'Symbolic engine is optional — do not claim CAS readiness without provider.'
    },
    createdAt: new Date().toISOString()
  };
}

export function analyzeStatistics({ data = [], x = null, y = null, alpha = 0.05 } = {}) {
  const arr = asArray(data.length ? data : (x || []));
  const m = mean(arr);
  const v = variance(arr, true);
  const sd = Math.sqrt(v);
  const n = arr.length;
  const se = sd / Math.sqrt(n);
  // rough normal approx CI
  const z = 1.96;
  const ci = [m - z * se, m + z * se];
  let correlation = null;
  if (x && y) correlation = pearson(asArray(x), asArray(y));

  const explanation = [
    `n=${n}. Mean ≈ ${roundSmart(m)}, sample SD ≈ ${roundSmart(sd)}.`,
    `Approximate ${Math.round((1 - alpha) * 100)}% CI for the mean (normal approx): [${roundSmart(ci[0])}, ${roundSmart(ci[1])}].`,
    correlation == null
      ? 'Provide paired x/y for correlation / simple regression assistance.'
      : `Pearson r ≈ ${roundSmart(correlation)}. Correlation is not causation; check residuals and study design.`,
    'Sylora explains assumptions — this is assistance, not automated scientific proof.'
  ].join(' ');

  return {
    descriptive: { n, mean: roundSmart(m), variance: roundSmart(v), stdev: roundSmart(sd) },
    confidenceInterval: { level: 1 - alpha, method: 'normal_approx', interval: ci.map(roundSmart) },
    correlation: correlation == null ? null : roundSmart(correlation),
    regression: null,
    hypothesisTest: {
      status: 'assisted',
      note: 'Hypothesis-test assistance requires explicit H0/H1 and test choice — not auto-declared significance.'
    },
    explanation,
    assumptions: [
      'IID sample unless stated otherwise',
      'CI uses normal approximation — verify for small n / skewed data',
      'Do not treat p-values as proof'
    ]
  };
}

export function visualizationManifest() {
  return {
    framework: 'science_viz_v1',
    types: ['graphs', 'charts', 'timelines', 'molecules', 'physics_sim', 'astronomy', 'model_3d'],
    lazyLoad: true,
    heavyEngines: ['molecules', 'physics_sim', 'astronomy', 'model_3d'],
    note: 'Do not load heavy engines unless the active view requests them.'
  };
}

export function matchResearchers({ interests = [], researchers = [], projects = [], institutions = [] } = {}) {
  const tags = interests.map(s => String(s).toLowerCase()).filter(Boolean);
  const score = (itemTags = []) => {
    const set = itemTags.map(t => String(t).toLowerCase());
    return tags.reduce((s, t) => s + (set.some(x => x.includes(t) || t.includes(x)) ? 1 : 0), 0);
  };
  return {
    researchers: researchers
      .map(r => ({ ...r, matchScore: score(r.interests || r.tags || []) }))
      .filter(r => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20),
    projects: projects
      .map(p => ({ ...p, matchScore: score(p.interests || p.tags || []) }))
      .filter(p => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20),
    institutions: institutions
      .map(i => ({ ...i, matchScore: score(i.interests || i.tags || []) }))
      .filter(i => i.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20),
    openCollaboration: true,
    note: 'Matching by declared research interests — not invasive profiling.'
  };
}

export function createScienceCircle({
  title = '',
  ownerId = null,
  paperId = null,
  libraryIds = []
} = {}) {
  return {
    id: id('circle'),
    title: String(title || 'Science Circle').slice(0, 200),
    ownerId,
    paperId,
    threads: [],
    citations: [],
    sharedLibraryIds: libraryIds || [],
    liveSeminarRef: null,
    moderation: { required: true, sourceLinking: true },
    createdAt: new Date().toISOString()
  };
}

export function addCircleComment(circle, { userId, text, citation = null, parentId = null } = {}) {
  const comment = {
    id: id('cmt'),
    userId,
    text: String(text || '').slice(0, 4000),
    citation: citation || null,
    parentId,
    createdAt: new Date().toISOString(),
    moderated: false
  };
  if (citation) circle.citations.push({ commentId: comment.id, ...citation });
  circle.threads.push(comment);
  return comment;
}
