function createNode(name, path, type) {
  return { name, path, type, children: [] };
}

function buildArtifactTree(files = []) {
  const root = createNode('root', '', 'folder');
  const fileMap = new Map();

  files.forEach((file) => {
    if (!file || !file.path) return;
    const parts = file.path.split('/').filter(Boolean);
    let current = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const nextPath = current.path ? `${current.path}/${part}` : part;
      let child = current.children.find((node) => node.name === part);
      if (!child) {
        child = createNode(part, nextPath, isFile ? 'file' : 'folder');
        current.children.push(child);
      }
      if (isFile) {
        child.type = 'file';
        fileMap.set(nextPath, file);
      }
      current = child;
    });
  });

  function sortTree(node) {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortTree);
  }

  sortTree(root);
  return { tree: root, fileMap };
}

function filterTree(node, query) {
  if (!query) return node;
  const lower = query.toLowerCase();
  if (node.type === 'file') {
    return node.path.toLowerCase().includes(lower) ? node : null;
  }
  const filteredChildren = node.children
    .map((child) => filterTree(child, query))
    .filter(Boolean);
  if (filteredChildren.length) {
    return { ...node, children: filteredChildren };
  }
  return node.path.toLowerCase().includes(lower) ? { ...node, children: [] } : null;
}

export { buildArtifactTree, filterTree };
