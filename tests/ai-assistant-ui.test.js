import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import vm from 'vm';

function loadAi(window, { plan = 'free' } = {}) {
  const raw = fs.readFileSync('./docs/js/ai-assistant.js', 'utf8');
  const sanitized = raw
    .replace(/import[^;]+;\n/g, '')
    .replace('export function promptComponent', 'function promptComponent');
  const code = sanitized + '\nwindow.__getCurrentMode = () => currentMode;\n';
  const context = vm.createContext({
    window,
    document: window.document,
    localStorage: window.localStorage,
    console,
    fetch: async () => {
      window.__fetchCalled = true;
      return { ok: true, json: async () => ({ output: '' }) };
    }
  });
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
  return { context, window };
}

test('promptMode change event updates current mode', () => {
  const dom = new JSDOM('<button id="runPrompt"></button><textarea id="promptInput"></textarea><div id="result"></div>', {
    url: 'https://example.com/ai-assistant-terraform/'
  });
  const { window } = dom;
  loadAi(window);
  window.document.dispatchEvent(
    new window.CustomEvent('promptMode:change', { detail: { mode: 'fast' } })
  );
  assert.equal(window.__getCurrentMode(), 'fast');
});

test('runPrompt blocks secure mode for free plan', async () => {
  const dom = new JSDOM('<button id="runPrompt"></button><textarea id="promptInput"></textarea><div id="result"></div>', {
    url: 'https://example.com/ai-assistant-terraform/'
  });
  const { window } = dom;
  const { context } = loadAi(window, { plan: 'free' });
  window.document.dispatchEvent(
    new window.CustomEvent('promptMode:change', { detail: { mode: 'secure' } })
  );
  context.showToast = (msg) => {
    window.__toast = msg;
  };
  await window.document.getElementById('runPrompt').click();
  assert.ok(window.__toast && window.__toast.includes('Secure mode is available'));
  assert.ok(!window.__fetchCalled);
});
