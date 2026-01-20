import JSZip from 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

const DEFAULT_README = (promptText) => {
  const safePrompt = (promptText || '').trim().slice(0, 400);
  const promptSection = safePrompt
    ? `\n## Generated from prompt\n\n> ${safePrompt.replace(/\n/g, '\n> ')}\n`
    : '';
  return `# Project Scaffold\n\nGenerated with Devopsia. Review the files and adjust for your environment.\n\n## How to use\n\n1. Review the generated files.\n2. Update variables, secrets, and environment-specific values.\n3. Run your deployment or infrastructure workflow.\n${promptSection}`.trim();
};

const MIT_LICENSE = (year) => `MIT License\n\nCopyright (c) ${year} Devopsia\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.`;

function detectProjectTypes(files = []) {
  const types = new Set();
  const paths = files.map((file) => file.path);

  if (paths.some((path) => path.endsWith('.tf'))) types.add('terraform');
  if (paths.some((path) => path.endsWith('Chart.yaml'))) types.add('helm');
  if (paths.some((path) => /(^|\/)kustomization\.ya?ml$/.test(path))) types.add('k8s');
  if (paths.some((path) => /(^|\/)manifests\/.*\.ya?ml$/.test(path))) types.add('k8s');
  if (paths.some((path) => path.endsWith('package.json'))) types.add('node');
  if (paths.some((path) => path.endsWith('pyproject.toml') || path.endsWith('requirements.txt'))) types.add('python');

  return types;
}

function buildGitignore(types) {
  const patterns = new Set();
  if (types.has('terraform')) {
    ['.terraform/', '*.tfstate', '*.tfstate.*', 'crash.log'].forEach((line) => patterns.add(line));
  }
  if (types.has('helm')) {
    ['charts/*.tgz', '.DS_Store'].forEach((line) => patterns.add(line));
  }
  if (types.has('k8s')) {
    ['.DS_Store'].forEach((line) => patterns.add(line));
  }
  if (types.has('node')) {
    ['node_modules/', 'dist/', '.env'].forEach((line) => patterns.add(line));
  }
  if (types.has('python')) {
    ['__pycache__/', '.venv/', '*.pyc'].forEach((line) => patterns.add(line));
  }

  return Array.from(patterns).join('\n');
}

function hasRootFile(files, name) {
  return files.some((file) => file.path.toLowerCase() === name.toLowerCase());
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function exportZip(files, filename = 'devopsia-artifacts.zip') {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.path, file.content || '');
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, filename);
}

async function exportScaffoldZip({ files, promptText, licenseChoice }) {
  const zip = new JSZip();
  files.forEach((file) => {
    zip.file(file.path, file.content || '');
  });

  const types = detectProjectTypes(files);

  if (!hasRootFile(files, 'README.md')) {
    zip.file('README.md', DEFAULT_README(promptText));
  }

  if (!hasRootFile(files, '.gitignore')) {
    const gitignore = buildGitignore(types);
    if (gitignore) zip.file('.gitignore', gitignore);
  }

  if (licenseChoice && licenseChoice.toLowerCase() === 'mit' && !hasRootFile(files, 'LICENSE')) {
    const year = new Date().getFullYear();
    zip.file('LICENSE', MIT_LICENSE(year));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'devopsia-github-scaffold.zip');
}

export { exportZip, exportScaffoldZip, detectProjectTypes, buildGitignore };
