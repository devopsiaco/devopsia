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

function safeRead(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.error('Local storage read failed', err);
    return null;
  }
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
  const resultEl = document.getElementById('result');
  const context = resolveContextMetadata();
  const requestId = generateRequestId();
  if (promptMode === 'secure' && userPlan !== 'pro') {
    showToast('Secure mode is available on Pro only');
    return;
  }
  resultEl.textContent = 'Generating...';
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
    resultEl.textContent = data.output;
    const user = auth.currentUser;
    if (user) {
      try {
        await addDoc(collection(db, 'users', user.uid, 'prompts'), {
          prompt,
          mode: promptMode,
          response: data.output,
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
    resultEl.textContent = 'Error generating code';
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
