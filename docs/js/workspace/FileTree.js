function createRow({ label, depth, isSelected, isFolder, isCollapsed, onClick }) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className =
    'w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
  row.style.paddingLeft = `${depth * 16 + 8}px`;
  if (isSelected) {
    row.classList.add('bg-blue-50', 'text-blue-700');
  }

  const icon = document.createElement('span');
  icon.className = 'text-xs text-gray-500';
  if (isFolder) {
    icon.textContent = isCollapsed ? '▸' : '▾';
  } else {
    icon.textContent = '•';
  }

  const text = document.createElement('span');
  text.className = 'truncate';
  text.textContent = label;

  row.appendChild(icon);
  row.appendChild(text);
  row.addEventListener('click', onClick);
  return row;
}

function renderNode(node, depth, options, container) {
  const { selectedPath, collapsedPaths, onToggle, onSelect } = options;
  if (node.type === 'folder') {
    const isCollapsed = collapsedPaths.has(node.path);
    container.appendChild(
      createRow({
        label: node.name || 'root',
        depth,
        isSelected: false,
        isFolder: true,
        isCollapsed,
        onClick: () => onToggle(node.path)
      })
    );
    if (!isCollapsed) {
      node.children.forEach((child) => renderNode(child, depth + 1, options, container));
    }
    return;
  }

  container.appendChild(
    createRow({
      label: node.name,
      depth,
      isSelected: node.path === selectedPath,
      isFolder: false,
      onClick: () => onSelect(node.path)
    })
  );
}

function renderFileTree(tree, options) {
  const container = document.createElement('div');
  container.className = 'space-y-0.5';
  if (!tree || !tree.children?.length) {
    const empty = document.createElement('div');
    empty.className = 'text-sm text-gray-500 px-3 py-2';
    empty.textContent = 'No files to display.';
    container.appendChild(empty);
    return container;
  }

  tree.children.forEach((child) => renderNode(child, 0, options, container));
  return container;
}

export { renderFileTree };
