import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import vm from 'vm';

function loadAi(window, { plan = 'free', fetchImpl, addDocImpl } = {}) {
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
    setTimeout,
    fetch: fetchImpl || (async () => {
      window.__fetchCalled = true;
      return { ok: true, json: async () => ({ output: '' }) };
    })
  });
  context.auth = { currentUser: { uid: 'u', emailVerified: true } };
  context.db = {};
  context.onAuthStateChanged = (auth, cb) => cb({ uid: 'u', emailVerified: true });
  context.doc = () => ({});
  context.getDoc = async () => ({ exists: () => true, data: () => ({ plan }) });
  context.setDoc = async () => {};
  context.collection = () => ({});
  context.addDoc = addDocImpl || (async () => {});
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

test('request payload and history include context metadata', async () => {
  const dom = new JSDOM(
    '<button id="runPrompt"></button><textarea id="promptInput">Generate</textarea><div id="result"></div>',
    { url: 'https://example.com/ai-assistant-gcp/' }
  );
  const { window } = dom;
  window.DEVOPSIA_CLOUD = 'gcp';

  let capturedBody = null;
  let storedDoc = null;
  const fetchImpl = async (_url, init) => {
    capturedBody = JSON.parse(init.body);
    return { ok: true, json: async () => ({ output: 'done', model: 'claude-3' }) };
  };
  const addDocImpl = async (_collectionRef, docData) => {
    storedDoc = docData;
  };

  loadAi(window, { plan: 'pro', fetchImpl, addDocImpl });

  window.document.dispatchEvent(
    new window.CustomEvent('promptMode:change', { detail: { mode: 'fast' } })
  );

  await window.document.getElementById('runPrompt').click();
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(capturedBody?.context?.cloud, 'gcp');
  assert.equal(capturedBody?.context?.goal, 'build');
  assert.equal(capturedBody?.context?.outputFormat, 'terraform');
  assert.equal(capturedBody?.context?.profile, 'secure');

  assert.equal(storedDoc?.cloud, 'gcp');
  assert.equal(storedDoc?.goal, 'build');
  assert.equal(storedDoc?.outputFormat, 'terraform');
  assert.equal(storedDoc?.profile, 'secure');
  assert.equal(storedDoc?.assistantType, 'cloud');
  assert.equal(storedDoc?.assistantCloud, 'gcp');
  assert.equal(storedDoc?.model, 'claude-3');
  assert.equal(storedDoc?.pagePath, '/ai-assistant-gcp/');
  assert.ok(storedDoc?.requestId);
  assert.ok(Object.prototype.hasOwnProperty.call(storedDoc, 'createdAt'));
});
