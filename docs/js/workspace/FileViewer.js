const DEFAULT_MAX_BYTES = 200_000;
const DEFAULT_MAX_LINES = 4000;

function buildLineNumberedContent(content) {
  const lines = content.split('\n');
  const container = document.createElement('div');
  container.className = 'space-y-0.5';

  lines.forEach((line, index) => {
    const row = document.createElement('div');
    row.className = 'flex gap-3';

    const number = document.createElement('span');
    number.className = 'w-10 text-right text-xs text-gray-400 select-none';
    number.textContent = String(index + 1);

    const text = document.createElement('span');
    text.className = 'flex-1 whitespace-pre-wrap break-words';
    text.textContent = line;

    row.appendChild(number);
    row.appendChild(text);
    container.appendChild(row);
  });

  return container;
}

function renderFileViewer({ file, onCopy, onDownload, maxBytes = DEFAULT_MAX_BYTES, maxLines = DEFAULT_MAX_LINES }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'h-full flex flex-col';

  if (!file) {
    const empty = document.createElement('div');
    empty.className = 'text-sm text-gray-500 p-6';
    empty.textContent = 'Select a file to preview its contents.';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3';

  const title = document.createElement('div');
  title.className = 'text-sm font-semibold text-gray-900 truncate';
  title.textContent = file.path;

  const actions = document.createElement('div');
  actions.className = 'flex items-center gap-2';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className =
    'inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => onCopy(file));

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className =
    'inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50';
  downloadBtn.textContent = 'Download';
  downloadBtn.addEventListener('click', () => onDownload(file));

  actions.appendChild(copyBtn);
  actions.appendChild(downloadBtn);

  header.appendChild(title);
  header.appendChild(actions);

  const contentWrap = document.createElement('div');
  contentWrap.className = 'flex-1 overflow-auto p-4 font-mono text-xs text-gray-800';

  const content = file.content || '';
  const byteLength = new TextEncoder().encode(content).length;
  const lineCount = content.split('\n').length;

  if (byteLength > maxBytes || lineCount > maxLines) {
    const notice = document.createElement('div');
    notice.className = 'text-sm text-gray-500';
    notice.textContent = 'File too large to preview. Use Download to view the full file.';
    contentWrap.appendChild(notice);
  } else {
    contentWrap.appendChild(buildLineNumberedContent(content));
  }

  wrapper.appendChild(header);
  wrapper.appendChild(contentWrap);
  return wrapper;
}

export { renderFileViewer };
