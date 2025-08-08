(function() {
  function safeQuery(sel, root=document) { return root.querySelector(sel); }
  function safeQueryAll(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

  // Returns the className of the export button on prompt-history as a string, or a fallback.
  function getExportBtnClasses() {
    const src = safeQuery('#export-json-btn');
    if (src && src.className) return src.className;
    // Fallback Tailwind style similar to common primary buttons
    return 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md ' +
           'bg-blue-500 text-white hover:bg-blue-600 transition border border-transparent';
  }

  // Apply the export button classes to target buttons, and enforce equal sizing.
  function applyExportStyleToModes(container) {
    const exportClasses = getExportBtnClasses();
    const buttons = safeQueryAll('.btn-mode', container);
    buttons.forEach(btn => {
      btn.className = `btn-mode ${exportClasses} min-w-[140px]`;
    });
    // Positioning: if a parent toolbar/group exists, ensure spacing and wrap like prompt-history
    const group = container.closest('.mode-toolbar') || container;
    if (group) {
      group.classList.add('flex', 'flex-wrap', 'gap-2', 'items-center');
    }
  }

  // Visual "active" state based on export btn style (swap to green variant for clarity)
  function setActiveButton(buttons, activeBtn) {
    buttons.forEach(b => {
      b.classList.remove('bg-green-500', 'hover:bg-green-600');
    });
    if (activeBtn) {
      // Replace the base blue with green to indicate active
      activeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
      activeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
      activeBtn.setAttribute('aria-pressed', 'true');
    }
  }

  // Initialize prompt mode buttons:
  // - Delegated click handling
  // - localStorage persistence
  // - On load: restore & call window.onModeChange(mode) if defined
  function initPromptModeControls() {
    const path = window.location.pathname;
    const match = path.match(/ai-assistant-([^/]+)/);
    const assistantKey = match ? match[1] : 'generic';
    const STORAGE_KEY = `devopsia.promptMode.${assistantKey}`;

    const container = safeQuery('#prompt-mode-buttons');
    if (!container) return;

    applyExportStyleToModes(container);

    const buttons = safeQueryAll('.btn-mode', container);
    const availableModes = buttons.map(b => b.dataset.mode).filter(Boolean);

    function highlight(mode) {
      // Reset to base (blue) for all, then set active (green) for chosen
      buttons.forEach(b => {
        b.classList.remove('bg-green-500', 'hover:bg-green-600');
        if (!b.classList.contains('bg-blue-500')) {
          b.classList.add('bg-blue-500', 'hover:bg-blue-600');
        }
        b.setAttribute('aria-pressed', 'false');
      });
      const activeBtn = buttons.find(b => b.dataset.mode === mode);
      setActiveButton(buttons, activeBtn);
    }

    const onModeChange = window.onModeChange || function(mode){ console.log('[Devopsia] Mode:', mode); };

    let savedMode = localStorage.getItem(STORAGE_KEY);
    if (!savedMode || !availableModes.includes(savedMode)) {
      savedMode = availableModes[0] || 'default';
    }
    highlight(savedMode);
    onModeChange(savedMode);

    // Delegated events support dynamic DOM
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-mode');
      if (!btn || !container.contains(btn)) return;

      const mode = btn.dataset.mode;
      if (!mode) return;

      localStorage.setItem(STORAGE_KEY, mode);
      highlight(mode);
      onModeChange(mode);
    });
  }

  // Fix incorrect Terraform link in the sidebar and normalize other assistant links
  function fixSidebarAssistantLinks() {
    const map = {
      'terraform': '/ai-assistant-terraform/',
      'helm': '/ai-assistant-helm/',
      'k8s': '/ai-assistant-k8s/',
      'yaml': '/ai-assistant-yaml/',
      'ansible': '/ai-assistant-ansible/',
      'docker': '/ai-assistant-docker/'
    };

    const sidebar = safeQuery('#sidebar-container') || document;
    Object.entries(map).forEach(([key, url]) => {
      // Try data attribute first
      const link = safeQuery(`a[data-assistant="${key}"]`, sidebar)
                || safeQuery(`a[href*="ai-assist"][href*="${key}"]`, sidebar)
                || safeQuery(`a[href*="${key}"]`, sidebar);
      if (link) link.setAttribute('href', url);
    });

    // Explicitly fix the typo if still present
    const bad = safeQuery('a[href="/ai-assistnat"]', sidebar);
    if (bad) bad.setAttribute('href', '/ai-assistant-terraform/');
  }

  // Public init
  window.DevopsiaUI = {
    initPromptModeControls,
    fixSidebarAssistantLinks,
    applyExportStyleToModes,
    getExportBtnClasses
  };

  document.addEventListener('DOMContentLoaded', () => {
    fixSidebarAssistantLinks();
    initPromptModeControls();
  });
})();
