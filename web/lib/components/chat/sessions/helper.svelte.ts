export let currentSessionId: string | null = $state(null);

const _INCOGNITO_SESSIONS_KEY = 'ody-incognito-sessions';
const API_BASE = '';

function _normalizeSessionsList(fetched) {
  if (!Array.isArray(fetched)) return [];
  const seen = new Set();
  const unique = [];
  for (const session of fetched) {
    if (!session || session.id == null) continue;
    const id = String(session.id);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(session);
  }
  return unique;
}

async function _cleanupIncognitoSessions() {
  const ids = _getIncognitoIds();
  if (ids.length === 0) return;
  // Keep the current active incognito session alive, delete the rest
  const toDelete = ids.filter((sid) => sid !== currentSessionId);
  if (toDelete.length === 0) return;
  const keep = ids.filter((sid) => sid === currentSessionId);
  sessionStorage.setItem(_INCOGNITO_SESSIONS_KEY, JSON.stringify(keep));
  await Promise.all(
    toDelete.map((sid) =>
      fetch(`${API_BASE}/api/session/${sid}`, { method: 'DELETE' }).catch(
        () => {},
      ),
    ),
  );
}

function _getIncognitoIds() {
  try {
    return JSON.parse(sessionStorage.getItem(_INCOGNITO_SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export async function getSessions() {
  try {
    // Delete incognito sessions left over from a previous page load
    await _cleanupIncognitoSessions();

    // Use prefetched data from login page if available (first load only)
    const prefetched = sessionStorage.getItem('ody-prefetch-sessions');
    let fetched;
    if (prefetched) {
      sessionStorage.removeItem('ody-prefetch-sessions');
      fetched = JSON.parse(prefetched);
    } else {
      const res = await fetch(`${API_BASE}/api/sessions`);
      fetched = await res.json();
    }
    return _normalizeSessionsList(fetched);
}
