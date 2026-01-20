const ARTIFACT_LIMITS = {
  maxFiles: 200,
  maxTotalBytes: 1_200_000,
  maxFileBytes: 200_000
};

function sanitizePath(input) {
  if (!input || typeof input !== 'string') return null;
  const normalized = input.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter((part) => part && part !== '.' && part !== '..');
  if (!parts.length) return null;
  return parts.join('/');
}

function truncateUtf8(text, maxBytes) {
  if (typeof text !== 'string') return '';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) return text;
  const truncated = bytes.slice(0, maxBytes);
  const decoder = new TextDecoder();
  return decoder.decode(truncated);
}

function sanitizeArtifactsV1(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.files)) return null;
  const encoder = new TextEncoder();
  let totalBytes = 0;
  const sanitized = [];

  for (const entry of payload.files) {
    if (!entry || typeof entry !== 'object') continue;
    const path = sanitizePath(entry.path);
    if (!path) continue;
    const content = typeof entry.content === 'string' ? entry.content : '';
    const mime = typeof entry.mime === 'string' ? entry.mime : '';
    const truncatedContent = truncateUtf8(content, ARTIFACT_LIMITS.maxFileBytes);
    const contentBytes = encoder.encode(truncatedContent).length;
    if (totalBytes + contentBytes > ARTIFACT_LIMITS.maxTotalBytes) break;
    totalBytes += contentBytes;
    sanitized.push({ path, content: truncatedContent, mime });
    if (sanitized.length >= ARTIFACT_LIMITS.maxFiles) break;
  }

  if (!sanitized.length) return null;
  return { files: sanitized };
}

function tryParseArtifactsString(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const marker = '[DEVOPSIA_ARTIFACTS_V1]';
  let candidate = raw.trim();
  const markerIndex = candidate.indexOf(marker);
  if (markerIndex >= 0) {
    candidate = candidate.slice(markerIndex + marker.length).trim();
  }
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate);
    return sanitizeArtifactsV1(parsed);
  } catch {
    return null;
  }
}

function extractArtifactsV1(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const structured = payload.responseStructured || payload.structured || payload.structuredResponse || null;
  const direct =
    structured?.artifacts_v1 ||
    structured?.artifactsV1 ||
    payload.artifacts_v1 ||
    payload.artifactsV1 ||
    structured?.files ||
    payload.files;
  const sanitized = sanitizeArtifactsV1(direct);
  if (sanitized) return sanitized;

  const artifacts = structured?.artifacts || payload.artifacts;
  if (Array.isArray(artifacts)) {
    for (const item of artifacts) {
      const content = typeof item?.content === 'string' ? item.content : item?.text || item?.body || '';
      const parsed = tryParseArtifactsString(content);
      if (parsed) return parsed;
    }
  }

  const fallback = typeof payload.output === 'string' ? payload.output : payload.response || payload.text;
  if (typeof fallback === 'string') {
    const parsed = tryParseArtifactsString(fallback);
    if (parsed) return parsed;
  }

  return null;
}

export { ARTIFACT_LIMITS, extractArtifactsV1, sanitizeArtifactsV1 };
