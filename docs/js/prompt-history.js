import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  where
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const loadingEl = document.getElementById('auth-loading');
const contentEl = document.getElementById('protected-content');
const listEl = document.getElementById('history-list');
const exportJsonBtn = document.getElementById('export-json-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const emptyEl = document.getElementById('history-empty');
const filterAssistantSelect = document.getElementById('history-filter-assistant');
const filterCloudSelect = document.getElementById('history-filter-cloud');
const filterGoalSelect = document.getElementById('history-filter-goal');
const filterProfileSelect = document.getElementById('history-filter-profile');
const filterFormatSelect = document.getElementById('history-filter-format');
const cloudFilterGroup = document.getElementById('history-cloud-filter-group');
const formatFilterLabel = document.getElementById('history-format-filter');

const STORAGE_KEYS = {
  assistantType: 'devopsia.history.assistantType',
  cloud: 'devopsia.history.cloud',
  goal: 'devopsia.history.goal',
  profile: 'devopsia.history.profile',
  format: 'devopsia.history.format'
};

const FILTER_DEFAULTS = {
  assistantType: 'all',
  cloud: 'all',
  goal: 'all',
  profile: 'all',
  format: 'all'
};

const FILTER_OPTIONS = {
  assistantType: ['all', 'cloud', 'format'],
  cloud: ['all', 'aws', 'azure', 'gcp'],
  goal: ['all', 'build', 'migrate', 'operate', 'secure'],
  profile: ['all', 'secure', 'optimized', 'default'],
  format: [
    'all',
    'terraform',
    'kubernetes',
    'helm',
    'ansible',
    'docker',
    'github-actions',
    'gitlab-ci',
    'observability',
    'policy'
  ]
};

function refreshEmptyState() {
  if (!emptyEl) return;
  emptyEl.classList.toggle('u-hidden', listEl.children.length > 0);
}

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

function normalizeFilter(value, type) {
  const normalized = value ? String(value).toLowerCase() : '';
  const allowed = FILTER_OPTIONS[type] || [];
  if (normalized && allowed.includes(normalized)) return normalized;
  return FILTER_DEFAULTS[type] || 'all';
}

function getSavedFilters() {
  return {
    assistantType: normalizeFilter(safeRead(STORAGE_KEYS.assistantType), 'assistantType'),
    cloud: normalizeFilter(safeRead(STORAGE_KEYS.cloud), 'cloud'),
    goal: normalizeFilter(safeRead(STORAGE_KEYS.goal), 'goal'),
    profile: normalizeFilter(safeRead(STORAGE_KEYS.profile), 'profile'),
    format: normalizeFilter(safeRead(STORAGE_KEYS.format), 'format')
  };
}

function syncFilterVisibility(assistantType) {
  const isAdvanced = assistantType === 'format';
  if (cloudFilterGroup) cloudFilterGroup.classList.toggle('hidden', isAdvanced);
  if (formatFilterLabel) formatFilterLabel.classList.toggle('hidden', !isAdvanced);
}

// Which subcollection holds history? prefer "history", fallback to "prompts"
let HISTORY_COLL = 'history';

function colRef(uid) {
  return collection(db, 'users', uid, HISTORY_COLL);
}

async function detectHistoryCollection(uid) {
  // Prefer "history"
  try {
    const snapHistory = await getDocs(query(colRefWith('history'), limit(1)));
    if (!snapHistory.empty) {
      HISTORY_COLL = 'history';
      return;
    }
  } catch (_) {}
  // Fallback to "prompts"
  try {
    const snapPrompts = await getDocs(query(colRefWith('prompts'), limit(1)));
    if (!snapPrompts.empty) {
      HISTORY_COLL = 'prompts';
      return;
    }
  } catch (_) {}
  // Default to "history" even if empty (new accounts)
  HISTORY_COLL = 'history';

  function colRefWith(name) {
    return collection(db, 'users', uid, name);
  }
}

async function getOrderedDocs(uid, pageLimit = 50, filters = FILTER_DEFAULTS) {
  const clauses = [];
  if (filters.assistantType && filters.assistantType !== 'all') {
    clauses.push(where('assistantType', '==', filters.assistantType));
  }
  if (filters.format && filters.format !== 'all') {
    clauses.push(where('format', '==', filters.format));
  }
  if (filters.assistantType !== 'format') {
    if (filters.cloud && filters.cloud !== 'all') clauses.push(where('cloud', '==', filters.cloud));
    if (filters.goal && filters.goal !== 'all') clauses.push(where('goal', '==', filters.goal));
    if (filters.profile && filters.profile !== 'all') clauses.push(where('profile', '==', filters.profile));
  }

  // Try ordering by createdAt desc, fallback to plain get if it fails
  try {
    const q = query(colRef(uid), ...clauses, orderBy('createdAt', 'desc'), limit(pageLimit));
    return await getDocs(q);
  } catch (err) {
    // Some docs may lack createdAt or index not built; fallback to unordered
    return await getDocs(query(colRef(uid), ...clauses, limit(pageLimit)));
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className = 'fixed top-4 right-4 bg-gray-800 text-white py-2 px-4 rounded shadow z-50';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function toLabel(value) {
  if (!value) return 'Unknown';
  const normalized = String(value).toLowerCase();
  const map = {
    aws: 'AWS',
    gcp: 'GCP',
    ci: 'CI',
    rbac: 'RBAC'
  };
  if (map[normalized]) return map[normalized];
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatMetadata(data) {
  const assistantType = (data.assistantType || '').toLowerCase();
  const isAdvanced = assistantType === 'format' || Boolean(data.format);
  const output = data.outputFormat || data.format || data.mode || 'unknown';

  if (isAdvanced) {
    const formatLabel = toLabel(data.format || data.outputFormat || 'unknown');
    const templateLabel = toLabel(data.templateTitle || data.templateId || 'Template');
    return `${formatLabel} • ${templateLabel} • ${toLabel(output)}`;
  }

  const cloud = (data.assistantCloud || data.cloud || 'unknown').toString();
  const goal = (data.goal || 'unknown').toString();
  const profile = (data.profile || data.mode || 'default').toString();
  return `${toLabel(cloud)} • ${toLabel(goal)} • ${toLabel(profile)} • ${toLabel(output)}`;
}

function stringifyStructured(structured) {
  if (!structured || typeof structured !== 'object') return '';
  const parts = [];
  if (structured.summary) parts.push(`Summary: ${structured.summary}`);
  if (Array.isArray(structured.plan) && structured.plan.length) parts.push(`Plan: ${structured.plan.join(' | ')}`);
  if (Array.isArray(structured.validation) && structured.validation.length) {
    const checks = structured.validation
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const name = item.label || item.name || item.title || '';
        if (!name) return '';
        const status = item.status ?? item.ok ?? item.passed ?? false;
        return `${status ? '✅' : '⚠️'} ${name}`;
      })
      .filter(Boolean)
      .join(', ');
    if (checks) parts.push(`Validation: ${checks}`);
  }
  if (Array.isArray(structured.artifacts) && structured.artifacts.length) {
    const names = structured.artifacts
      .map((art, idx) => art?.filename || art?.name || art?.type || `Artifact ${idx + 1}`)
      .filter(Boolean)
      .join(', ');
    if (names) parts.push(`Artifacts: ${names}`);
  }
  if (structured.notes) parts.push(`Notes: ${structured.notes}`);
  return parts.join('\n');
}

function pickResponseText(data) {
  const text = data.responseText || data.response || data.output || data.text || '';
  if (text) return text;
  return stringifyStructured(data.responseStructured);
}

onAuthStateChanged(auth, async (user) => {
  if (!user || !user.emailVerified) {
    window.location.replace('/login/');
    return;
  }
  if (loadingEl) loadingEl.classList.add('u-hidden');
  if (contentEl) contentEl.classList.remove('u-hidden');

  await detectHistoryCollection(user.uid);

  let activeFilters = getSavedFilters();
  if (activeFilters.assistantType === 'format') {
    activeFilters = { ...activeFilters, cloud: 'all', goal: 'all', profile: 'all' };
  } else {
    activeFilters = { ...activeFilters, format: 'all' };
  }

  const exportHistory = async (type) => {
    try {
      const snapAll = await getDocs(colRef(user.uid)); // small datasets
      const data = snapAll.docs.map((d) => {
        const val = d.data();
        return {
          prompt: val.prompt || '',
          mode: val.mode || '',
          createdAt: val.createdAt?.toDate ? val.createdAt.toDate().toISOString() : '',
          response: val.response || '',
          isFavorite: val.isFavorite ?? ''
        };
      });
      if (type === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompt-history.json';
        a.click();
        URL.revokeObjectURL(url);
      } else if (type === 'csv') {
        const header = ['prompt', 'mode', 'createdAt', 'response', 'isFavorite'];
        const rows = data.map((row) =>
          header
            .map((key) => `"${String(row[key]).replace(/"/g, '""')}"`)
            .join(',')
        );
        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompt-history.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export prompt history', err);
    }
  };

  if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => exportHistory('json'));
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportHistory('csv'));

  const hydrateFilterControls = () => {
    if (filterAssistantSelect) filterAssistantSelect.value = activeFilters.assistantType;
    if (filterCloudSelect) filterCloudSelect.value = activeFilters.cloud;
    if (filterGoalSelect) filterGoalSelect.value = activeFilters.goal;
    if (filterProfileSelect) filterProfileSelect.value = activeFilters.profile;
    if (filterFormatSelect) filterFormatSelect.value = activeFilters.format;
    syncFilterVisibility(activeFilters.assistantType);
  };

  const loadHistory = async () => {
    if (!listEl) return;
    listEl.innerHTML = '';
    try {
      const snap = await getOrderedDocs(user.uid, 50, activeFilters);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const item = document.createElement('li');
        item.className = 'history-item is-collapsed';
        item.dataset.id = docSnap.id;
        if (data.isFavorite) item.classList.add('bg-yellow-50');

        // grid wrapper
        const row = document.createElement('div');
        row.className = 'history-grid';

        // col 1: star (fixed size)
        const starBtn = document.createElement('button');
        starBtn.type = 'button';
        starBtn.className = 'star-btn';
        starBtn.title = data.isFavorite ? 'Unfavorite' : 'Save to favorites';
        starBtn.textContent = data.isFavorite ? '⭐' : '☆';

        // col 2: prompt (title + expandable body)
        const promptCol = document.createElement('div');
        const title = document.createElement('div');
        const text = data.prompt || data.input || '';
        title.className = 'prompt-text';
        title.textContent = text;

        const metadata = document.createElement('div');
        metadata.className = 'text-xs text-gray-500 mt-1';
        metadata.textContent = formatMetadata(data);

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'toggle-btn text-sm text-blue-600 hover:underline';
        toggleBtn.textContent = '\u25B6 Expand';

        const body = document.createElement('pre');
        body.className = 'history-body u-hidden';
        body.textContent = pickResponseText(data);

        promptCol.appendChild(title);
        promptCol.appendChild(metadata);
        promptCol.appendChild(toggleBtn);
        promptCol.appendChild(body);

        // col 3: meta + delete
        const metaCol = document.createElement('div');
        metaCol.className = 'meta-wrap';
        const modeSpan = document.createElement('span');
        modeSpan.className = 'badge';
        const badgeLabel = data.assistantType === 'format' ? 'Advanced' : data.mode || data.profile || 'default';
        modeSpan.textContent = toLabel(badgeLabel);
        const dateSpan = document.createElement('span');
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : null;
        dateSpan.textContent = date ? date.toLocaleString() : '';
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-entry btn btn-ghost text-danger';
        deleteBtn.textContent = 'Delete';
        metaCol.appendChild(modeSpan);
        metaCol.appendChild(dateSpan);
        metaCol.appendChild(deleteBtn);

        // assemble row
        row.appendChild(starBtn);
        row.appendChild(promptCol);
        row.appendChild(metaCol);

        // toggle details when clicking prompt area (but not star/delete)
        item.appendChild(row);
        listEl.appendChild(item);

        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const collapsed = item.classList.toggle('is-collapsed');
          body.classList.toggle('u-hidden', collapsed);
          toggleBtn.textContent = collapsed ? '\u25B6 Expand' : '\u25BC Collapse';
        });

        // Optional: expand on title click
        title.addEventListener('click', () => {
          const collapsed = item.classList.toggle('is-collapsed');
          body.classList.toggle('u-hidden', collapsed);
          toggleBtn.textContent = collapsed ? '\u25B6 Expand' : '\u25BC Collapse';
        });

        starBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const newVal = !data.isFavorite;
          try {
            await updateDoc(doc(db, 'users', user.uid, HISTORY_COLL, docSnap.id), { isFavorite: newVal });
            data.isFavorite = newVal;
            starBtn.textContent = newVal ? '⭐' : '☆';
            item.classList.toggle('bg-yellow-50', newVal);
          } catch (err) {
            console.error('Failed to toggle favorite', err);
          }
        });
      });
    } catch (err) {
      console.error('Failed to load prompt history', err);
    }
    refreshEmptyState();
  };

  const handleFilterChange = () => {
    const selected = {
      assistantType: normalizeFilter(filterAssistantSelect?.value, 'assistantType'),
      cloud: normalizeFilter(filterCloudSelect?.value, 'cloud'),
      goal: normalizeFilter(filterGoalSelect?.value, 'goal'),
      profile: normalizeFilter(filterProfileSelect?.value, 'profile'),
      format: normalizeFilter(filterFormatSelect?.value, 'format')
    };

    const isAdvanced = selected.assistantType === 'format';
    activeFilters = {
      assistantType: selected.assistantType,
      cloud: isAdvanced ? 'all' : selected.cloud,
      goal: isAdvanced ? 'all' : selected.goal,
      profile: isAdvanced ? 'all' : selected.profile,
      format: isAdvanced ? selected.format : 'all'
    };

    Object.entries(selected).forEach(([key, val]) => safeWrite(STORAGE_KEYS[key], val));
    syncFilterVisibility(selected.assistantType);
    loadHistory();
  };

  if (filterAssistantSelect) filterAssistantSelect.addEventListener('change', handleFilterChange);
  if (filterCloudSelect) filterCloudSelect.addEventListener('change', handleFilterChange);
  if (filterGoalSelect) filterGoalSelect.addEventListener('change', handleFilterChange);
  if (filterProfileSelect) filterProfileSelect.addEventListener('change', handleFilterChange);
  if (filterFormatSelect) filterFormatSelect.addEventListener('change', handleFilterChange);

  hydrateFilterControls();
  loadHistory();
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-entry');
    if (!btn) return;
    e.stopPropagation();
    const li = btn.closest('li[data-id]');
    const entryId = li?.dataset.id;
    const uid = auth.currentUser?.uid;
    if (!entryId || !uid) return;
    li.remove();
    try {
      await deleteDoc(doc(db, 'users', uid, HISTORY_COLL, entryId));
      showToast('Entry deleted');
    } catch (err) {
      console.error('Failed to delete entry', err);
    }
    refreshEmptyState();
  });

  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete all history?')) return;
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        const histRef = colRef(uid);
        const snapAll = await getDocs(histRef);
        const batch = writeBatch(db);
        snapAll.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        listEl.innerHTML = '';
        showToast('All history cleared');
      } catch (err) {
        console.error('Failed to clear history', err);
      }
      refreshEmptyState();
    });
  }
});
