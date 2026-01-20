import { buildUnifiedDiff } from '../artifacts/diff.js';

function renderDiffViewer({ previousText = '', currentText = '' }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'h-full flex flex-col';

  const header = document.createElement('div');
  header.className = 'border-b border-gray-200 px-4 py-3';

  const title = document.createElement('div');
  title.className = 'text-sm font-semibold text-gray-900';
  title.textContent = 'Diff (Previous → Generated)';

  header.appendChild(title);

  const contentWrap = document.createElement('div');
  contentWrap.className = 'flex-1 overflow-auto p-4 font-mono text-xs';

  const diffLines = buildUnifiedDiff(previousText, currentText);
  if (!diffLines.length) {
    const empty = document.createElement('div');
    empty.className = 'text-sm text-gray-500';
    empty.textContent = 'No differences found.';
    contentWrap.appendChild(empty);
  } else {
    diffLines.forEach((line, index) => {
      const row = document.createElement('div');
      row.className = 'flex gap-3 px-2 py-0.5 rounded';
      if (line.type === 'add') row.classList.add('bg-green-50', 'text-green-700');
      if (line.type === 'remove') row.classList.add('bg-red-50', 'text-red-700');

      const number = document.createElement('span');
      number.className = 'w-10 text-right text-gray-400 select-none';
      number.textContent = String(index + 1);

      const prefix = document.createElement('span');
      prefix.className = 'w-4 text-center text-gray-400';
      prefix.textContent = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';

      const text = document.createElement('span');
      text.className = 'flex-1 whitespace-pre-wrap break-words';
      text.textContent = line.content;

      row.appendChild(number);
      row.appendChild(prefix);
      row.appendChild(text);
      contentWrap.appendChild(row);
    });
  }

  wrapper.appendChild(header);
  wrapper.appendChild(contentWrap);
  return wrapper;
}

export { renderDiffViewer };
