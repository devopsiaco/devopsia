import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import fs from 'fs';
import vm from 'vm';

// helper to load ui-common.js into a window
function loadUiCommon(window){
  const code = fs.readFileSync('./docs/js/ui-common.js', 'utf8');
  const context = vm.createContext({ window, document: window.document, localStorage: window.localStorage, console });
  const script = new vm.Script(code, { filename: 'ui-common.js' });
  script.runInContext(context);
  return context.window.DevopsiaUI;
}

// helper to load ai-assistant.js with stubbed firebase
function loadAiAssistant(window, {plan='free'} = {}){
  const raw = fs.readFileSync('./docs/js/ai-assistant.js', 'utf8');
    const sanitized = raw
      .replace(/import[^;]+;\n/g, '')
      .replace('export function promptComponent', 'function promptComponent')
      .replace('setTimeout(() => toast.remove(), 3000);', '');
    const code = sanitized + '\nwindow.__getCurrentMode = () => currentMode;\n';
    const context = vm.createContext({ window, document: window.document, localStorage: window.localStorage, console });
  // stub firebase and firestore helpers
  context.auth = {};
  context.db = {};
  context.onAuthStateChanged = (auth, cb) => cb({ uid: 'u', emailVerified: true });
  context.doc = () => ({});
  context.getDoc = async () => ({ exists: () => true, data: () => ({ plan }) });
  context.setDoc = async () => {};
  context.collection = () => ({});
  context.addDoc = async () => {};
  context.serverTimestamp = () => 0;
  const script = new vm.Script(code, { filename: 'ai-assistant.js' });
  script.runInContext(context);
  return { promptComponent: context.promptComponent, context };
}

function createDom(path, {withExport=true} = {}){
  const exportBtn = withExport ? '<button id="export-json-btn" class="inline-flex px-4 py-2 bg-blue-500 text-white hover:bg-blue-600">Export JSON</button>' : '';
  const html = `${exportBtn}<div class="mode-toolbar mb-4"><div id="prompt-mode-buttons"><button class="btn-mode" data-mode="default">Default</button><button class="btn-mode" data-mode="optimized">Optimized</button><button class="btn-mode" data-mode="secure">Secure</button></div></div><button id="runPrompt"></button><div id="result"></div>`;
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: `https://example.com/${path}/`});
  return dom;
}

const assistants = ['terraform','helm','k8s','yaml','ansible','docker'];

test('prompt mode persists across reloads for each assistant page', () => {
  for (const key of assistants){
    const dom1 = createDom(`ai-assistant/${key}`, {withExport:false});
    const {window} = dom1;
    const ui = loadUiCommon(window);
    ui.initPromptModeControls();
    const optBtn = window.document.querySelector('.btn-mode[data-mode="optimized"]');
    optBtn.click();
    const storageKey = `devopsia.promptMode.${key}`;
    const saved = window.localStorage.getItem(storageKey);
    // simulate reload
    const dom2 = createDom(`ai-assistant/${key}`, {withExport:false});
    dom2.window.localStorage.setItem(storageKey, saved);
    const ui2 = loadUiCommon(dom2.window);
    ui2.initPromptModeControls();
    const active = dom2.window.document.querySelector('.btn-mode.bg-green-500');
    assert.ok(active, 'active button should be highlighted');
    assert.equal(active.dataset.mode, 'optimized');
  }
});

test('secure button disabled for non-pro users', async () => {
  const dom = createDom('ai-assistant/terraform');
  const {window} = dom;
  const ui = loadUiCommon(window);
  ui.initPromptModeControls();
  const {promptComponent} = loadAiAssistant(window, {plan:'free'});
  const comp = promptComponent();
  await comp.init();
  const secureBtn = window.document.querySelector('.btn-mode[data-mode="secure"]');
  assert.ok(secureBtn.disabled);
  assert.ok(secureBtn.classList.contains('opacity-50'));
});

test('non-Pro users cannot activate secure mode and receive toast', async () => {
  const dom = createDom('ai-assistant/terraform');
  const {window} = dom;
  const ui = loadUiCommon(window);
  ui.initPromptModeControls();
  const {promptComponent, context} = loadAiAssistant(window, {plan:'free'});
  const comp = promptComponent();
  await comp.init();
  // attempt to activate secure mode programmatically within VM context
  vm.runInContext('window.onModeChange("secure")', context);
  const toast = Array.from(window.document.querySelectorAll('div')).find(d => d.textContent.includes('Secure mode is available on Pro only'));
  assert.ok(toast, 'toast should appear');
  assert.equal(window.__getCurrentMode(), 'default');
});

test('mode buttons adopt export button styles', () => {
  const dom = createDom('ai-assistant/terraform');
  const {window} = dom;
  const ui = loadUiCommon(window);
  ui.initPromptModeControls();
  const exportClass = window.document.getElementById('export-json-btn').className;
  const exportClasses = exportClass.split(/\s+/).filter(Boolean);
  const buttons = window.document.querySelectorAll('#prompt-mode-buttons .btn-mode');
  buttons.forEach(btn => {
    assert.equal(btn.classList.contains('btn-mode'), true);
    assert.equal(btn.classList.contains('min-w-[140px]'), true);
    exportClasses.forEach(cls => {
      if (cls.startsWith('bg-') || cls.startsWith('hover:bg-')) return;
      assert.equal(btn.classList.contains(cls), true);
    });
  });
  // non-active buttons should retain base blue styles
  ['optimized','secure'].forEach(mode => {
    const btn = window.document.querySelector(`.btn-mode[data-mode="${mode}"]`);
    ['bg-blue-500','hover:bg-blue-600'].forEach(cls => assert.equal(btn.classList.contains(cls), true));
  });
  const group = window.document.querySelector('.mode-toolbar');
  ['flex','flex-wrap','gap-2','items-center'].forEach(cls => assert.equal(group.classList.contains(cls), true));
});
