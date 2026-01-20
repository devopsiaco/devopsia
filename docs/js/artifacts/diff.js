import { diffLines } from 'https://cdn.jsdelivr.net/npm/diff@5.2.0/+esm';

function buildUnifiedDiff(previousText = '', currentText = '') {
  const parts = diffLines(previousText, currentText);
  const lines = [];
  parts.forEach((part) => {
    const type = part.added ? 'add' : part.removed ? 'remove' : 'context';
    const split = part.value.split('\n');
    split.forEach((line, index) => {
      if (index === split.length - 1 && line === '') return;
      lines.push({ type, content: line });
    });
  });
  return lines;
}

export { buildUnifiedDiff };
