import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let userPlan = 'free';
let currentMode = 'secure';
const STORAGE_KEYS = {
  cloud: 'devopsia.cloud',
  goal: 'devopsia.goal',
  outputFormat: 'devopsia.outputFormat',
  profile: 'devopsia.profile'
};

const VALID_VALUES = {
  cloud: ['aws', 'azure', 'gcp', 'unknown'],
  goal: ['build', 'migrate', 'operate', 'secure', 'unknown'],
  outputFormat: ['terraform', 'yaml', 'bicep', 'cli', 'runbook', 'unknown'],
  profile: ['secure', 'optimized', 'default']
};

const MAX_ARTIFACT_CHARS = 12000;

function safeRead(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.error('Local storage read failed', err);
    return null;
  }
}

function ensureResultContainer() {
  const el = document.getElementById('result');
  if (!el) return null;
  if (el.dataset.enhanced === 'true') return el;

  let container = el;
  if (el.tagName === 'PRE') {
    container = document.createElement('div');
    container.id = el.id;
    container.className = el.className;
    el.replaceWith(container);
  }

  container.dataset.enhanced = 'true';
  container.classList.add('space-y-4');
  return container;
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.text || item.title || item.step || item.summary || '';
        return '';
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeArtifacts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const content = typeof item.content === 'string' ? item.content : item.body || item.text || '';
      const type = item.type || item.artifactType || item.kind || '';
      const filename = item.filename || item.path || item.name || '';
      const summary = item.summary || item.description || '';
      return { content, type, filename, summary };
    })
    .filter((item) => item && (item.content || item.summary || item.filename || item.type));
}

function normalizeValidation(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const label = item.label || item.name || item.check || item.title || '';
      const status = item.status ?? item.ok ?? item.passed ?? item.valid ?? false;
      const detail = item.detail || item.reason || item.notes || '';
      return { label, status, detail };
    })
    .filter((item) => item && item.label);
}

function normalizeResponsePayload(data) {
  const responseText = (data?.output || data?.response || data?.text || '').toString();
  const structured = data?.responseStructured || data?.structured || data?.structuredResponse || null;

  const summary = structured?.summary || data?.summary || '';
  const plan = normalizeList(structured?.plan || data?.plan || structured?.steps);
  const artifacts = normalizeArtifacts(structured?.artifacts || data?.artifacts || structured?.files || structured?.attachments);
  const validation = normalizeValidation(structured?.validation || data?.validation || structured?.checks);
  const notes = structured?.notes || data?.notes || '';

  const hasStructured = Boolean(summary || plan.length || artifacts.length || validation.length || notes);

  return {
    responseText,
    summary,
    plan,
    artifacts,
    validation,
    notes,
    hasStructured,
    responseStructured: structured
  };
}

function trimStructured(structured) {
  if (!structured || typeof structured !== 'object') return null;
  const clone = { ...structured };
  if (Array.isArray(clone.artifacts)) {
    clone.artifacts = clone.artifacts.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const copy = { ...item };
      if (typeof copy.content === 'string' && copy.content.length > MAX_ARTIFACT_CHARS) {
        const truncatedBy = copy.content.length - MAX_ARTIFACT_CHARS;
        copy.content = `${copy.content.slice(0, MAX_ARTIFACT_CHARS)}\n\n[...truncated ${truncatedBy} chars]`;
        copy.truncated = true;
      }
      return copy;
    });
  }
  return clone;
}

function renderCopyButton(text) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'ml-auto inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50';
  btn.textContent = 'Copy';
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text || '');
      showToast('Copied to clipboard');
    } catch (err) {
      console.error('Copy failed', err);
      showToast('Unable to copy', 'error');
    }
  });
  return btn;
}

function renderStructuredResponse(container, payload) {
  if (!container) return;
  const { responseText, summary, plan, artifacts, validation, notes, hasStructured } = normalizeResponsePayload(payload || {});

  container.innerHTML = '';

  if (!hasStructured) {
    container.classList.add('whitespace-pre-wrap', 'font-mono', 'text-sm');
    container.textContent = responseText || 'No response';
    return;
  }

  container.classList.remove('whitespace-pre-wrap', 'font-mono');
  container.classList.add('text-sm', 'space-y-4');

  const sectionWrap = document.createElement('div');
  sectionWrap.className = 'space-y-4';

  const summarySection = document.createElement('div');
  summarySection.className = 'space-y-1';
  const summaryTitle = document.createElement('h3');
  summaryTitle.className = 'font-semibold text-gray-900';
  summaryTitle.textContent = 'Summary';
  const summaryBody = document.createElement('p');
  summaryBody.className = 'text-gray-800 whitespace-pre-line';
  summaryBody.textContent = summary || responseText || 'No summary provided';
  summarySection.appendChild(summaryTitle);
  summarySection.appendChild(summaryBody);
  sectionWrap.appendChild(summarySection);

  if (plan.length) {
    const planSection = document.createElement('div');
    planSection.className = 'space-y-2';
    const planTitle = document.createElement('h3');
    planTitle.className = 'font-semibold text-gray-900';
    planTitle.textContent = 'Plan';
    const list = document.createElement('ul');
    list.className = 'list-disc list-inside space-y-1 text-gray-800';
    plan.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    planSection.appendChild(planTitle);
    planSection.appendChild(list);
    sectionWrap.appendChild(planSection);
  }

  if (artifacts.length) {
    const artifactsSection = document.createElement('div');
    artifactsSection.className = 'space-y-2';
    const artifactsTitle = document.createElement('h3');
    artifactsTitle.className = 'font-semibold text-gray-900';
    artifactsTitle.textContent = 'Artifacts';
    artifactsSection.appendChild(artifactsTitle);

    const artifactsWrap = document.createElement('div');
    artifactsWrap.className = 'space-y-3';

    artifacts.forEach((artifact, idx) => {
      const details = document.createElement('details');
      details.className = 'rounded border border-gray-200 bg-white shadow-sm';
      if (idx === 0) details.open = true;

      const summaryEl = document.createElement('summary');
      summaryEl.className = 'flex items-center gap-2 cursor-pointer px-3 py-2 text-gray-900 font-medium';
      const label = artifact.filename || artifact.type || `Artifact ${idx + 1}`;
      const meta = [];
      if (artifact.type) meta.push(artifact.type);
      if (artifact.filename) meta.push(artifact.filename);
      summaryEl.textContent = meta.length ? meta.join(' • ') : label;

      const body = document.createElement('div');
      body.className = 'border-t border-gray-200 p-3 space-y-2';
      if (artifact.summary) {
        const summaryPara = document.createElement('p');
        summaryPara.className = 'text-gray-700';
        summaryPara.textContent = artifact.summary;
        body.appendChild(summaryPara);
      }

      const pre = document.createElement('pre');
      pre.className = 'bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-xs whitespace-pre-wrap';
      const code = document.createElement('code');
      code.textContent = artifact.content || '';
      pre.appendChild(code);

      const copyRow = document.createElement('div');
      copyRow.className = 'flex items-center';
      copyRow.appendChild(renderCopyButton(artifact.content || ''));

      body.appendChild(copyRow);
      body.appendChild(pre);

      details.appendChild(summaryEl);
      details.appendChild(body);
      artifactsWrap.appendChild(details);
    });

    artifactsSection.appendChild(artifactsWrap);
    sectionWrap.appendChild(artifactsSection);
  }

  if (validation.length) {
    const valSection = document.createElement('div');
    valSection.className = 'space-y-2';
    const valTitle = document.createElement('h3');
    valTitle.className = 'font-semibold text-gray-900';
    valTitle.textContent = 'Validation';
    const list = document.createElement('ul');
    list.className = 'space-y-1';

    validation.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'flex items-start gap-2 text-gray-800';
      const indicator = document.createElement('span');
      indicator.textContent = item.status ? '✅' : '⚠️';
      const text = document.createElement('div');
      text.className = 'flex-1';
      const title = document.createElement('div');
      title.className = 'font-medium';
      title.textContent = item.label;
      text.appendChild(title);
      if (item.detail) {
        const detail = document.createElement('div');
        detail.className = 'text-xs text-gray-600';
        detail.textContent = item.detail;
        text.appendChild(detail);
      }
      li.appendChild(indicator);
      li.appendChild(text);
      list.appendChild(li);
    });

    valSection.appendChild(valTitle);
    valSection.appendChild(list);
    sectionWrap.appendChild(valSection);
  }

  if (notes) {
    const notesSection = document.createElement('div');
    notesSection.className = 'space-y-1';
    const notesTitle = document.createElement('h3');
    notesTitle.className = 'font-semibold text-gray-900';
    notesTitle.textContent = 'Notes';
    const notesBody = document.createElement('p');
    notesBody.className = 'text-gray-800 whitespace-pre-line';
    notesBody.textContent = notes;
    notesSection.appendChild(notesTitle);
    notesSection.appendChild(notesBody);
    sectionWrap.appendChild(notesSection);
  }

  container.appendChild(sectionWrap);
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    console.error('Local storage write failed', err);
  }
}

function normalizeSelection(value, category, fallback) {
  const allowed = VALID_VALUES[category] || [];
  const normalized = value ? String(value).toLowerCase() : '';
  if (normalized && allowed.includes(normalized)) return normalized;
  const fallbackNormalized = fallback ? String(fallback).toLowerCase() : '';
  if (fallbackNormalized && allowed.includes(fallbackNormalized)) return fallbackNormalized;
  return 'unknown';
}

function resolveContextMetadata() {
  const pageCloud = (window.DEVOPSIA_CLOUD || document.getElementById('tool')?.value || 'unknown').toLowerCase();
  const cloud = normalizeSelection(safeRead(STORAGE_KEYS.cloud) || pageCloud, 'cloud', pageCloud || 'unknown');
  const goal = normalizeSelection(safeRead(STORAGE_KEYS.goal) || 'build', 'goal', 'build');
  const outputFormat = normalizeSelection(
    safeRead(STORAGE_KEYS.outputFormat) || 'terraform',
    'outputFormat',
    'terraform'
  );
  const profile = normalizeSelection(safeRead(STORAGE_KEYS.profile) || 'secure', 'profile', 'secure');

  return { cloud, goal, outputFormat, profile };
}

function generateRequestId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID();
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setActivePills(group, value) {
  group.querySelectorAll('button[data-value]').forEach((btn) => {
    const isActive = btn.dataset.value === value;
    btn.dataset.active = String(isActive);
    btn.classList.toggle('border-blue-500', isActive);
    btn.classList.toggle('text-blue-700', isActive);
    btn.classList.toggle('bg-blue-50', isActive);
    btn.classList.toggle('shadow-sm', isActive);
  });
}

function hydrateContextSelectors() {
  const container = document.getElementById('context-selectors');
  if (!container) return;

  const defaultCloud = (window.DEVOPSIA_CLOUD || document.getElementById('tool')?.value || 'aws').toLowerCase();
  const selections = {
    cloud: (safeRead(STORAGE_KEYS.cloud) || defaultCloud).toLowerCase(),
    goal: (safeRead(STORAGE_KEYS.goal) || 'build').toLowerCase(),
    outputFormat: (safeRead(STORAGE_KEYS.outputFormat) || 'terraform').toLowerCase(),
    profile: (safeRead(STORAGE_KEYS.profile) || 'secure').toLowerCase()
  };

  Object.entries(selections).forEach(([key, val]) => {
    safeWrite(STORAGE_KEYS[key], val);
  });

  const cloudGroup = container.querySelector('[data-selector-group="cloud"]');
  const goalGroup = container.querySelector('[data-selector-group="goal"]');
  const outputFormatSelect = container.querySelector('select[data-selector="output-format"]');
  const profileSelect = container.querySelector('select[data-selector="profile"]');
  const advancedPanel = container.querySelector('#advanced-selector-panel');
  const advancedToggle = container.querySelector('#advanced-selector-toggle');
  const toggleIcon = advancedToggle?.querySelector('svg');

  if (cloudGroup) {
    setActivePills(cloudGroup, selections.cloud);
    cloudGroup.querySelectorAll('button[data-value]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        setActivePills(cloudGroup, value);
        safeWrite(STORAGE_KEYS.cloud, value);
      });
    });
  }

  if (goalGroup) {
    setActivePills(goalGroup, selections.goal);
    goalGroup.querySelectorAll('button[data-value]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        setActivePills(goalGroup, value);
        safeWrite(STORAGE_KEYS.goal, value);
      });
    });
  }

  if (outputFormatSelect) {
    const hasMatch = Array.from(outputFormatSelect.options).some((opt) => opt.value === selections.outputFormat);
    outputFormatSelect.value = hasMatch ? selections.outputFormat : outputFormatSelect.options[0]?.value || 'terraform';
    outputFormatSelect.addEventListener('change', (e) => {
      const value = e.target.value;
      safeWrite(STORAGE_KEYS.outputFormat, value);
    });
  }

  if (profileSelect) {
    const hasMatch = Array.from(profileSelect.options).some((opt) => opt.value === selections.profile);
    profileSelect.value = hasMatch ? selections.profile : profileSelect.options[0]?.value || 'secure';
    profileSelect.addEventListener('change', (e) => {
      const value = e.target.value;
      safeWrite(STORAGE_KEYS.profile, value);
    });
  }

  if (advancedToggle && advancedPanel) {
    advancedToggle.addEventListener('click', () => {
      const isHidden = advancedPanel.classList.contains('hidden');
      advancedPanel.classList.toggle('hidden', !isHidden);
      if (toggleIcon) {
        toggleIcon.classList.toggle('rotate-180', isHidden);
      }
    });
  }
}

document.addEventListener('promptMode:change', (e) => {
  currentMode = e.detail.mode;
});
document.addEventListener('DOMContentLoaded', () => {
  document.dispatchEvent(new window.Event('promptMode:get'));
});

document.addEventListener('DOMContentLoaded', () => {
  hydrateContextSelectors();
});

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'fixed top-4 right-4 bg-gray-800 text-white py-2 px-4 rounded shadow z-50';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');

onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');
  } else {
    window.location.replace('/login/');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const match = path.match(/ai-assistant-([^/]+)/);
  if (match) {
    const name = match[1]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    const breadcrumb = document.createElement('nav');
    breadcrumb.className = 'text-sm text-gray-500 mb-4';
    breadcrumb.innerHTML = `<a href="/" class="hover:underline">Home</a> / ${name}`;
    document.querySelector('main')?.prepend(breadcrumb);
  }
});

export function promptComponent() {
  return {
    isPro: false,
    async init() {
      onAuthStateChanged(auth, async (user) => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        try {
          const planSnap = await getDoc(userRef);
          if (planSnap.exists() && typeof planSnap.data().plan === 'string') {
            userPlan = planSnap.data().plan.toLowerCase();
            this.isPro = userPlan === 'pro';
          }
        } catch (err) {
          console.error('Failed to load user settings', err);
        }
      });
    }
  };
}

document.getElementById('runPrompt').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value;
  const promptMode = currentMode;
  const tool = document.getElementById('tool')?.value || 'general';
  const resultEl = ensureResultContainer();
  const context = resolveContextMetadata();
  const requestId = generateRequestId();
  if (promptMode === 'secure' && userPlan !== 'pro') {
    showToast('Secure mode is available on Pro only');
    return;
  }
  if (resultEl) {
    resultEl.textContent = 'Generating...';
    resultEl.classList.add('whitespace-pre-wrap', 'font-mono', 'text-sm');
  }
  try {
    // Central API base. Override via window.__DEVOPSIA_API_BASE if needed.
    const API_BASE = (window.__DEVOPSIA_API_BASE || 'https://e0wxwjllp0.execute-api.eu-north-1.amazonaws.com/prod').replace(/\/+$/, '');
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, promptMode, tool, context })
    });
    if (!res.ok) throw new Error('Request failed');
    const data = await res.json();
    const normalized = normalizeResponsePayload(data);

    renderStructuredResponse(resultEl, data);

    const user = auth.currentUser;
    if (user) {
      try {
        const structured =
          normalized.responseStructured ||
          (normalized.hasStructured
            ? {
                summary: normalized.summary,
                plan: normalized.plan,
                artifacts: normalized.artifacts,
                validation: normalized.validation,
                notes: normalized.notes
              }
            : null);

        await addDoc(collection(db, 'users', user.uid, 'prompts'), {
          prompt,
          mode: promptMode,
          response: normalized.responseText,
          responseText: normalized.responseText,
          responseStructured: trimStructured(structured),
          cloud: context.cloud,
          goal: context.goal,
          outputFormat: context.outputFormat,
          profile: context.profile,
          assistantType: 'cloud',
          assistantCloud: context.cloud,
          requestId,
          model: data.model || data.modelName,
          pagePath: window.location?.pathname,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Failed to save prompt history', err);
      }
    }
  } catch (err) {
    console.error('Prompt run failed', err);
    if (resultEl) {
      resultEl.textContent = 'Error generating code';
      resultEl.classList.add('whitespace-pre-wrap', 'font-mono', 'text-sm');
    }
  }
});

// ---------------------------
// File processing integration
// ---------------------------
(function attachFileProcessing() {
  const API_BASE = (window.__DEVOPSIA_API_BASE || 'https://e0wxwjllp0.execute-api.eu-north-1.amazonaws.com/prod').replace(/\/+$/, '');

  async function postJSON(path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const raw = await res.text();
    let data; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { _parseError: raw }; }
    if (!res.ok) {
      const detail = data?.detail || data?.error || data?._parseError || raw || `HTTP ${res.status}`;
      throw new Error(detail);
    }
    return data;
  }

  // Optional per-page UI (only wires if present)
  const fileInput = document.getElementById('fileInput');
  const operationSelect = document.getElementById('operationSelect');
  const instructionsInput = document.getElementById('instructionsInput');
  const processBtn = document.getElementById('processFileBtn');
  const resultEl = document.getElementById('processResult');

  if (!processBtn) return;

  processBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('Please choose a file first.');
      return;
    }
    const file = fileInput.files[0];
    const fileName = file.name || 'input.txt';
    const operation = (operationSelect?.value || 'clean').toLowerCase();
    const instructions = (instructionsInput?.value || '').trim();

    // Read file
    let content;
    try { content = await file.text(); }
    catch (err) { console.error('Read file failed:', err); showToast('Failed to read file.'); return; }

    // Guard ~1.2MB
    const byteLen = new TextEncoder().encode(content).length;
    if (byteLen > 1_150_000) { showToast('File too large for processing (~>1.2MB).'); return; }

    const original = processBtn.textContent;
    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';
    if (resultEl) resultEl.textContent = 'Processing...';

    try {
      const data = await postJSON('/process-file', { operation, fileName, content, instructions });
      const out = data?.resultText ?? '';
      if (!out) throw new Error('No resultText returned');
      if (resultEl) {
        if ('value' in resultEl) resultEl.value = out;
        else resultEl.textContent = out;
      }
      showToast('File processed.');
    } catch (err) {
      console.error('Process file error:', err);
      if (resultEl) {
        const msg = String(err?.message || err || 'Error processing file');
        resultEl.textContent = `Error: ${msg}`;
      }
      showToast('Error processing file.');
    } finally {
      processBtn.disabled = false;
      processBtn.textContent = original;
    }
  });
})();
