import { buildArtifactTree, filterTree } from '../artifacts/tree.js';
import { exportZip, exportScaffoldZip } from '../artifacts/exportScaffold.js';
import { renderFileTree } from './FileTree.js';
import { renderFileViewer } from './FileViewer.js';
import { renderDiffViewer } from './DiffViewer.js';

const SEARCH_DEBOUNCE_MS = 150;

function downloadFile(file) {
  const blob = new Blob([file.content || ''], { type: file.mime || 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = file.path.split('/').pop() || file.path;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text || '').catch((err) => console.error('Copy failed', err));
}

function getLicenseChoice() {
  try {
    return window.localStorage.getItem('devopsia.license');
  } catch {
    return null;
  }
}

function buildTabs(activeTab, setTab) {
  const tabWrap = document.createElement('div');
  tabWrap.className = 'flex gap-2 md:hidden';

  ['files', 'preview'].forEach((tab) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors';
    if (tab === activeTab) {
      btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    } else {
      btn.classList.add('border-gray-200', 'text-gray-600', 'hover:bg-gray-50');
    }
    btn.textContent = tab === 'files' ? 'Files' : 'Preview';
    btn.addEventListener('click', () => setTab(tab));
    tabWrap.appendChild(btn);
  });

  return tabWrap;
}

function buildWorkspacePanel({ artifacts, previousArtifacts, promptText }) {
  const section = document.createElement('section');
  section.id = 'workspace-panel';
  section.className = 'mt-6 font-sans';

  if (!artifacts?.files?.length) {
    return section;
  }

  const { tree, fileMap } = buildArtifactTree(artifacts.files);
  const previousMap = new Map();
  (previousArtifacts?.files || []).forEach((file) => {
    previousMap.set(file.path, file);
  });

  let selectedPath = artifacts.files[0]?.path || '';
  let filterQuery = '';
  let diffMode = false;
  let activeTab = 'preview';
  const collapsedPaths = new Set();

  const panel = document.createElement('div');
  panel.className = 'border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden';

  const header = document.createElement('div');
  header.className = 'border-b border-gray-200 px-4 py-3 space-y-3 bg-gray-50/60';

  const headerTop = document.createElement('div');
  headerTop.className = 'flex flex-wrap items-center justify-between gap-3';

  const title = document.createElement('div');
  title.className = 'text-sm font-semibold text-gray-900';
  title.textContent = 'Workspace';

  const actionWrap = document.createElement('div');
  actionWrap.className = 'flex flex-wrap items-center gap-2';

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className =
    'inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50';
  exportBtn.textContent = 'Export ZIP';
  exportBtn.addEventListener('click', () => exportZip(artifacts.files));

  const scaffoldBtn = document.createElement('button');
  scaffoldBtn.type = 'button';
  scaffoldBtn.className =
    'inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50';
  scaffoldBtn.textContent = 'Export GitHub Scaffold';
  scaffoldBtn.addEventListener('click', () =>
    exportScaffoldZip({ files: artifacts.files, promptText, licenseChoice: getLicenseChoice() })
  );

  actionWrap.appendChild(exportBtn);
  actionWrap.appendChild(scaffoldBtn);

  headerTop.appendChild(title);
  headerTop.appendChild(actionWrap);

  const searchRow = document.createElement('div');
  searchRow.className = 'flex flex-col gap-2 md:flex-row md:items-center';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search files...';
  searchInput.className =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500';

  const viewToggle = document.createElement('button');
  viewToggle.type = 'button';
  viewToggle.className =
    'inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
  viewToggle.textContent = 'View: Preview';

  searchRow.appendChild(searchInput);
  searchRow.appendChild(viewToggle);

  header.appendChild(headerTop);
  header.appendChild(searchRow);

  const tabRow = buildTabs(activeTab, (tab) => {
    activeTab = tab;
    render();
  });
  header.appendChild(tabRow);

  const body = document.createElement('div');
  body.className = 'flex flex-col md:flex-row h-[480px]';

  const treePanel = document.createElement('div');
  treePanel.className =
    'md:w-[300px] border-r border-gray-200 bg-white overflow-y-auto p-3';

  const viewerPanel = document.createElement('div');
  viewerPanel.className = 'flex-1 bg-white overflow-hidden';

  body.appendChild(treePanel);
  body.appendChild(viewerPanel);

  panel.appendChild(header);
  panel.appendChild(body);
  section.appendChild(panel);

  let searchTimer;
  searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      filterQuery = searchInput.value.trim();
      render();
    }, SEARCH_DEBOUNCE_MS);
  });

  function handleToggle(path) {
    if (collapsedPaths.has(path)) collapsedPaths.delete(path);
    else collapsedPaths.add(path);
    renderTree();
  }

  function handleSelect(path) {
    selectedPath = path;
    diffMode = false;
    renderViewer();
    renderTree();
  }

  function renderTree() {
    treePanel.innerHTML = '';
    const filtered = filterTree(tree, filterQuery) || { children: [] };
    treePanel.appendChild(
      renderFileTree(filtered, {
        selectedPath,
        collapsedPaths,
        onToggle: handleToggle,
        onSelect: handleSelect
      })
    );
  }

  function renderViewer() {
    viewerPanel.innerHTML = '';
    const file = fileMap.get(selectedPath);
    const previousFile = previousMap.get(selectedPath);
    const canDiff = Boolean(previousFile);

    viewToggle.disabled = !canDiff;
    viewToggle.textContent = `View: ${diffMode ? 'Diff' : 'Preview'}`;

    if (diffMode && canDiff) {
      viewerPanel.appendChild(renderDiffViewer({ previousText: previousFile.content || '', currentText: file?.content || '' }));
      return;
    }

    viewerPanel.appendChild(
      renderFileViewer({
        file,
        onCopy: (selected) => copyToClipboard(selected.content || ''),
        onDownload: downloadFile
      })
    );
  }

  viewToggle.addEventListener('click', () => {
    if (!previousMap.has(selectedPath)) return;
    diffMode = !diffMode;
    renderViewer();
  });

  function render() {
    const isFilesTab = activeTab === 'files';
    treePanel.classList.toggle('hidden', !isFilesTab && window.innerWidth < 768);
    viewerPanel.classList.toggle('hidden', isFilesTab && window.innerWidth < 768);
    renderTree();
    renderViewer();
  }

  const handleResize = () => {
    if (!section.isConnected) {
      window.removeEventListener('resize', handleResize);
      return;
    }
    render();
  };
  window.addEventListener('resize', handleResize);
  render();

  return section;
}

export { buildWorkspacePanel };
