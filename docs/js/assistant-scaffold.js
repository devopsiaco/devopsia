(function() {
  function buildAssistantLayout(config = {}) {
    const {
      title = 'AI Assistant',
      subtitle = '',
      promptPlaceholder = 'Type your DevOps question...',
      tool = 'general',
      backLink,
      formatNote,
      guardrailNote,
      whatYouGet = []
    } = config;

    const hasWhatYouGet = Array.isArray(whatYouGet) && whatYouGet.length > 0;

    const toolInput = tool ? `<input type="hidden" id="tool" value="${tool}">` : '';

    return `
  <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
    <aside id="sidebar-container" class="md:col-span-3"></aside>

    <main class="md:col-span-9">
      <div class="text-sm text-gray-500 mb-3">
        <a href="/" class="hover:underline">Home</a> / <span class="text-gray-700">AI Assistant</span>
      </div>

      <h1 class="text-2xl font-semibold">${title}</h1>
      ${subtitle ? `<p class="text-gray-600 mb-4">${subtitle}</p>` : ''}
      ${backLink ? `<div class="mb-4"><a href="${backLink.href}" class="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline">← ${backLink.text}</a></div>` : ''}
      ${formatNote ? `<div class="mb-4 text-sm text-gray-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">${formatNote}</div>` : ''}
      <div x-data="promptComponent()" id="promptContainer" class="bg-white p-6 rounded-lg shadow space-y-4">
        <div id="context-selectors" class="space-y-3">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-2">
              <div class="text-[11px] font-semibold text-gray-600 tracking-wide uppercase">Cloud</div>
              <div class="flex flex-wrap gap-2" data-selector-group="cloud">
                <button type="button" data-value="aws" class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  AWS
                </button>
                <button type="button" data-value="azure" class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Azure
                </button>
                <button type="button" data-value="gcp" class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  GCP
                </button>
              </div>
            </div>
            <div class="space-y-2">
              <div class="text-[11px] font-semibold text-gray-600 tracking-wide uppercase">Goal</div>
              <div class="flex flex-wrap gap-2" data-selector-group="goal">
                <button type="button" data-value="build" class="px-3 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Build
                </button>
                <button type="button" data-value="migrate" class="px-3 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Migrate
                </button>
                <button type="button" data-value="operate" class="px-3 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Operate
                </button>
                <button type="button" data-value="secure" class="px-3 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Secure
                </button>
              </div>
            </div>
          </div>

          <div class="border rounded-lg bg-gray-50/80 border-gray-200">
            <button type="button" id="advanced-selector-toggle" class="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-700">
              <span>Advanced options</span>
              <svg class="w-4 h-4 text-gray-500 transition-transform" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
              </svg>
            </button>
            <div id="advanced-selector-panel" class="hidden border-t border-gray-200 px-4 py-3 space-y-3 bg-white">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="space-y-1">
                  <label class="text-sm font-medium text-gray-700">Output format</label>
                  <select data-selector="output-format" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                    <option value="terraform">Terraform</option>
                    <option value="yaml">YAML</option>
                    <option value="bicep">Bicep</option>
                    <option value="cli">CLI</option>
                    <option value="runbook">Runbook</option>
                    <option value="dockerfile">Dockerfile</option>
                    <option value="markdown">Markdown</option>
                    <option value="rego">Rego</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-sm font-medium text-gray-700">Profile</label>
                  <select data-selector="profile" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                    <option value="secure">Secure</option>
                    <option value="optimized">Optimized</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="template-picker" class="hidden border rounded-lg bg-gray-50/80 border-gray-200 p-4 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-[11px] font-semibold text-gray-600 tracking-wide uppercase">Templates</div>
              <p class="text-sm text-gray-600">Start from a curated prompt for this format.</p>
            </div>
            <span class="text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-1">Beta</span>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700" for="template-select">Template</label>
            <select id="template-select" class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="">Freeform prompt</option>
            </select>
          </div>
          <p id="template-description" class="hidden text-sm text-gray-700"></p>
          <div id="template-fields" class="space-y-3"></div>
        </div>
        <div>
          <div class="flex items-center mb-1">
            <span class="block text-sm font-medium">Prompt Mode</span>
            <div class="relative group ml-1">
              <button class="text-sm text-gray-500 hover:text-blue-600">ⓘ</button>
              <div class="absolute top-full mt-2 w-64 p-2 bg-white border border-gray-200 rounded shadow-lg text-sm hidden group-hover:block z-50">
                Secure mode restricts Claude to safe, validated infrastructure generation.
              </div>
            </div>
          </div>
          <div
            x-data="promptModeDropdown()"
            x-init="init()"
            class="relative inline-block text-left mb-4"
          >
            <button
              @click="toggle()"
              @keydown.arrow-down.prevent="openAndMove(1)"
              @keydown.arrow-up.prevent="openAndMove(-1)"
              @keydown.enter.prevent="openAndSelect()"
              @keydown.space.prevent="toggle()"
              @keydown.escape.prevent.stop="open = false"
              :aria-expanded="open"
              aria-haspopup="listbox"
              class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium bg-white hover:bg-gray-50 border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span x-html="iconFor(value)" aria-hidden="true"></span>
              <span class="text-gray-700">Mode:</span>
              <span class="text-gray-900" x-text="labelFor(value)"></span>
              <svg class="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/>
              </svg>
            </button>

            <div
              x-cloak
              x-show="open"
              @click.outside="open = false"
              @keydown.escape.prevent.stop="open = false"
              class="absolute z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-2"
              role="listbox"
              :aria-activedescendant="'mode-opt-' + activeIndex"
            >
              <template x-for="(opt, idx) in options" :key="opt.value">
                <button
                  type="button"
                  @click="select(idx)"
                  @mousemove="activeIndex = idx"
                  @keydown.arrow-down.prevent="move(1)"
                  @keydown.arrow-up.prevent="move(-1)"
                  @keydown.enter.prevent="select(activeIndex)"
                  @keydown.space.prevent="select(activeIndex)"
                  :id="'mode-opt-' + idx"
                  role="option"
                  :aria-selected="value === opt.value"
                  class="w-full flex items-start gap-3 rounded-lg px-3 py-2 text-left focus:outline-none"
                  :class="activeIndex === idx ? 'bg-gray-50' : 'hover:bg-gray-50'"
                  tabindex="-1"
                >
                  <div class="mt-0.5 shrink-0" x-html="iconFor(opt.value)" aria-hidden="true"></div>

                  <div class="min-w-0">
                    <div class="text-sm font-medium text-gray-900" x-text="opt.label"></div>
                    <div class="text-xs text-gray-500" x-text="opt.desc"></div>
                  </div>

                  <div class="ml-auto flex items-center gap-2">
                    <span class="text-[10px] text-gray-400 uppercase tracking-wide" x-text="opt.badge"></span>
                    <div class="w-2.5 h-2.5 rounded-full" :class="value === opt.value ? 'bg-blue-600' : 'bg-gray-300'"></div>
                  </div>
                </button>
              </template>
            </div>

            <input type="hidden" id="prompt-mode" name="promptMode" x-model="value">
          </div>
        </div>
        <textarea id="promptInput" class="w-full p-4 border rounded" rows="5" placeholder="${promptPlaceholder}"></textarea>
        ${toolInput}
        <button id="runPrompt" class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded w-full">Run Prompt</button>
        ${guardrailNote ? `<p class="text-[12px] text-gray-600 text-center">${guardrailNote}</p>` : ''}
      <pre id="result" class="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap"></pre>
      </div>
      ${hasWhatYouGet ? `<section class="mt-6 border rounded-xl p-4 bg-white/80 backdrop-blur">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">What you'll get</h2>
          <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Files · Validation · Gotchas</span>
        </div>
        <ul class="grid gap-3 md:grid-cols-3">
          ${whatYouGet.map(item => `<li class="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
            <div class="text-sm font-semibold text-gray-800">${item.label}</div>
            <p class="text-sm text-gray-600 mt-1">${item.detail}</p>
          </li>`).join('')}
        </ul>
      </section>` : ''}
      <section class="mt-6 border rounded-xl p-4 bg-white/80 backdrop-blur">
        <h2 class="text-lg font-semibold mb-3">File Tools</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-2">
            <label class="block text-sm text-gray-600">Select file</label>
            <input type="file" id="fileInput" class="block w-full border rounded px-3 py-2" />
            <label class="block text-sm text-gray-600">Operation</label>
            <select id="operationSelect" class="block w-full border rounded px-3 py-2">
              <option value="clean">Clean (trim whitespace)</option>
              <option value="format">Format (pretty-print JSON)</option>
              <option value="minify">Minify (collapse whitespace)</option>
              <option value="optimize">Optimize (AI-assisted)</option>
            </select>
            <label class="block text-sm text-gray-600">Instructions (for Optimize)</label>
            <textarea id="instructionsInput" class="block w-full min-h-[80px] border rounded px-3 py-2" placeholder="e.g., Keep YAML comments; sort keys if JSON."></textarea>
            <button id="processFileBtn" class="mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Process File</button>
          </div>
          <div class="space-y-2">
            <label class="block text-sm text-gray-600">Result</label>
            <textarea id="processResult" class="block w-full h-[240px] border rounded px-3 py-2 font-mono text-sm" placeholder="Processed output will appear here"></textarea>
          </div>
        </div>
      </section>
    </main>
  </div>
    `;
  }

  window.renderAssistantPage = function renderAssistantPage(config) {
    const target = document.getElementById('assistant-root');
    if (!target) return;
    target.innerHTML = buildAssistantLayout(config);
  };

  window.attachAssistantChrome = function attachAssistantChrome() {
    window.showToast = function showToast(msg, type = 'info') {
      let el = document.getElementById('toast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        document.body.appendChild(el);
      }
      const palette = {
        info:  ['bg-gray-900','text-white'],
        success:['bg-green-600','text-white'],
        error: ['bg-red-600','text-white'],
        warn:  ['bg-orange-600','text-white'],
      }[type] || ['bg-gray-900','text-white'];
      el.className = 'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ' + palette.join(' ');
      el.textContent = msg;
      el.style.opacity = '1';
      el.classList.remove('hidden');
      setTimeout(() => { el.style.opacity = '0'; }, 2200);
      setTimeout(() => { el.classList.add('hidden'); }, 2600);
    };

    (async function loadSidebar(){
      try {
        const res = await fetch('/components/sidebar.html', { cache:'no-store' });
        const html = await res.text();
        const ctn = document.getElementById('sidebar-container');
        if (ctn) ctn.innerHTML = html;

        const active = document.querySelector(`#sidebar-container a[href="${location.pathname}"]`);
        if (active) active.classList.add('bg-gray-100','text-gray-900','font-semibold');
      } catch(e) {
        console.error('Sidebar load failed', e);
      }
    })();

    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        if (window.__autoLogout) return;
        window.location.href = '/login/';
      }
    });
  };
})();
