import {
  isLoading, //?
  modelItems,
  refreshModels, //f
} from '$lib/components/chat/models/modelItemStore.svelte';
import { sortModelObjects } from '$lib/legacy/modelSort.js';

interface ModelInfo {
  display: string | null;
  epName: string;
  mid: string;
  offline: boolean;
  providerText: string;
  stale: boolean;
  staleReason: string | null;
  url: string;
}

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  '01-ai': 'Yi',
  abacusai: 'Abacus AI',
  adept: 'Adept',
  ai21: 'AI21 Labs',
  'aion-labs': 'Aion Labs',
  aisingapore: 'AI Singapore',
  allenai: 'Allen AI',
  amazon: 'Amazon',
  'anthracite-org': 'Anthracite',
  anthropic: 'Anthropic',
  'arcee-ai': 'Arcee AI',
  baai: 'BAAI',
  baidu: 'Baidu',
  bigcode: 'BigCode',
  'black-forest-labs': 'Black Forest Labs',
  bytedance: 'ByteDance',
  'bytedance-seed': 'ByteDance',
  cognitivecomputations: 'Cognitive Computations',
  cohere: 'Cohere',
  databricks: 'Databricks',
  deepcogito: 'DeepCogito',
  deepseek: 'DeepSeek',
  'deepseek-ai': 'DeepSeek',
  essentialai: 'Essential AI',
  google: 'Google',
  gryphe: 'Gryphe',
  ibm: 'IBM',
  'ibm-granite': 'IBM Granite',
  inception: 'Inception',
  inclusionai: 'Inclusion AI',
  inflection: 'Inflection',
  kwaipilot: 'KwaiPilot',
  liquid: 'Liquid AI',
  mancer: 'Mancer',
  meta: 'Llama',
  'meta-llama': 'Llama',
  microsoft: 'Microsoft',
  minimax: 'MiniMax',
  minimaxai: 'MiniMax',
  mistralai: 'Mistral',
  moonshotai: 'Moonshot',
  morph: 'Morph',
  'nex-agi': 'Nex AGI',
  nousresearch: 'Nous Research',
  'nv-mistralai': 'NVIDIA x Mistral',
  nvidia: 'NVIDIA',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  perceptron: 'Perceptron',
  perplexity: 'Perplexity',
  poolside: 'Poolside',
  'prime-intellect': 'Prime Intellect',
  qwen: 'Qwen',
  rekaai: 'Reka',
  relace: 'Relace',
  sao10k: 'Sao10k',
  sarvamai: 'Sarvam AI',
  snowflake: 'Snowflake',
  stepfun: 'StepFun',
  'stepfun-ai': 'StepFun',
  stockmark: 'Stockmark',
  switchpoint: 'SwitchPoint',
  tencent: 'Tencent',
  thedrummer: 'TheDrummer',
  undi95: 'Undi95',
  upstage: 'Upstage',
  writer: 'Writer',
  'x-ai': 'xAI',
  xiaomi: 'Xiaomi',
  'z-ai': 'Zhipu',
  zyphra: 'Zyphra',
  '~anthropic': 'Anthropic',
  '~google': 'Google',
  '~moonshotai': 'Moonshot',
  '~openai': 'OpenAI',
};

const PROVIDER_ALIAS: Record<string, string> = {
  'meta-llama': 'meta',
  deepseek: 'deepseek-ai',
  minimaxai: 'minimax',
  'stepfun-ai': 'stepfun',
  ai21labs: 'ai21',
  'ibm-granite': 'ibm',
  'bytedance-seed': 'bytedance',
  '~anthropic': 'anthropic',
  '~google': 'google',
  '~moonshotai': 'moonshotai',
  '~openai': 'openai',
};
const RECENT_KEY = 'odysseus-model-recent';
const FAVORITES_KEY = 'odysseus-model-favorites';
const RECENT_MAX = 5;

let _modelList: any[] = [];
let unsubscribeModelItems = modelItems.subscribe((value) => {
  _modelList = value;
});

// Local endpoint health — only probed for LOCAL endpoints, since
// cloud APIs are essentially always up. Cached briefly on the
// server side too (8s TTL). Picker opens do not probe; the refresh button
// is the explicit network/probe action.
let _localProbe = {};            // {endpoint_id: {alive, latency_ms, error}}
let _localProbeFetchedAt = 0;
const _LOCAL_PROBE_TTL_MS = 5000;
let _pickerLoading = false;
let _pickerLoadSeq = 0;

let favorites = $state([]);
let recent = $state([]);

async function _refreshLocalProbe() {
  try {
    if (window.__odysseusChatBusy || Date.now() < (window.__odysseusChatBusyUntil || 0)) return;
  } catch (_) {}
  const now = Date.now();
  if (now - _localProbeFetchedAt < _LOCAL_PROBE_TTL_MS) return;
  _localProbeFetchedAt = now;
  try {
    const r = await fetch('/api/model-endpoints/probe-local', { credentials: 'same-origin' });
    if (r.ok) _localProbe = (await r.json()) || {};
  } catch (_) { /* leave stale data; picker still works */ }
}
export function pushRecent(mid) {
  if (!mid) return;
  const next = _loadRecent().filter((x) => x !== mid);
  next.unshift(mid);
  _saveList(RECENT_KEY, next.slice(0, RECENT_MAX));
}
function modelExists(modelId, url) {
  const items = _modelList;
  if (!items.length) return true; // ???
  const targetUrl = (url || '').replace(/\/+$/, '');
  return items.some((item) => {
    if (item.offline) return false;
    const itemUrl = (item.url || '').replace(/\/+$/, '');
    const models = (item.models || []).concat(item.models_extra || []);
    return models.includes(modelId) && (!targetUrl || itemUrl === targetUrl);
  });
}

function providerDisplayName(slug: string): string {
  return (
    PROVIDER_NAMES[slug] ||
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
  );
}

function providerSlug(mid: string): string {
  const slash = mid.indexOf('/');
  let slug = slash > 0 ? mid.substring(0, slash) : 'other';
  return PROVIDER_ALIAS[slug] || slug;
}

function _loadList(key: string): any[] {
  try {
    const a = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function _saveList(key: string, list: any[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

function _loadFavorites(): string[] {
  return _loadList('odysseus-model-favorites');
}

function toggleFavorite(modelId: string): boolean {
  const favs = _loadFavorites();
  const i = favs.indexOf(modelId);
  if (i >= 0) favs.splice(i, 1);
  else favs.push(modelId);
  _saveList(FAVORITES_KEY, favs);
  // Keep the sidebar Models section (same key) in sync if it's mounted.
  try {
    if (
      window.modelsModule &&
      typeof window.modelsModule.refreshModels === 'function'
    ) {
      window.modelsModule.refreshModels();
    }
  } catch {
    /* sidebar not present */
  }
  return i < 0; // true when now favorited
}

function _loadRecent(): string[] {
  return _loadList('odysseus-model-recent');
}

function saveRecent(next: string[]): void {
  _saveList('odysseus-model-recent', next.slice(0, 5));
}

function loadModels(): any[] {
  return window.modelsModule?.getCachedItems?.() || [];
}

function loadFavorites(): string[] {
  return _loadFavorites();
}

function loadRecent(): string[] {
  return _loadRecent();
}

function getAllModels(): any[] {
  const items =
    window.modelsModule && window.modelsModule.getCachedItems
      ? window.modelsModule.getCachedItems()
      : [];
  const result = [];
  const seen = new Set();
  items.forEach((item) => {
    // Previously: offline endpoints were skipped entirely, so a server
    // that briefly went down disappeared from the picker — confusing
    // when the user can still see it (offline-tagged) in Settings.
    // Now: include offline-endpoint models too but flag them
    // `stale: true` so the row renderer dims them + shows the offline
    // pill. The user can still click and try anyway (matches the
    // existing "local server appears offline" path on line 301).
    const epOffline = !!item.offline;
    const allModels = (item.models || []).concat(item.models_extra || []);
    const allDisplay = (item.models_display || []).concat(
      item.models_extra_display || [],
    );
    // Mark local endpoints whose live probe failed.
    const probeResult = item.endpoint_id ? _localProbe[item.endpoint_id] : null;
    const isLocalDead = !!(probeResult && probeResult.alive === false);
    const isApiEndpoint = item.category && item.category !== 'local';
    allModels.forEach((mid, i) => {
      // Local/self-hosted servers often expose the same model through several
      // stale endpoints, so keep deduping those by model id. Cloud/API
      // endpoints are user-selected provider routes; the same model id can be
      // intentionally enabled on OpenRouter and OpenAI, so key those by
      // endpoint too or the chat picker silently drops one.
      const seenKey = isApiEndpoint
        ? `${item.endpoint_id || item.url || item.endpoint_name || 'api'}::${mid}`
        : mid;
      if (seen.has(seenKey)) return;
      seen.add(seenKey);
      result.push({
        key: seenKey,
        mid,
        display: (allDisplay[i] || mid).split('/').pop(),
        url: item.url,
        endpointId: item.endpoint_id,
        epName: item.endpoint_name || '',
        category: item.category || '',
        providerText: [
          item.endpoint_name || '',
          item.category || '',
          item.host || '',
          item.url || '',
        ]
          .filter(Boolean)
          .join(' '),
        stale: isLocalDead || epOffline,
        staleReason: epOffline
          ? item.ping_error || 'endpoint offline'
          : isLocalDead
            ? probeResult.error || 'not responding'
            : '',
        offline: epOffline,
      });
    });
  });
  return sortModelObjects(result);
}

function _populate() {
  const listEl = document.getElementById('model-picker-list');
  const search = document.getElementById(
    'model-picker-search',
  ) as HTMLInputElement;
  if (!listEl) return;

  listEl.innerHTML = '';

  const all = allModels;
  const q = search?.value.trim().toLowerCase() || '';
  const hasAnyModel = all.length > 0;

  listEl.classList.toggle('is-empty', !hasAnyModel);

  if (search) {
    search.placeholder = hasAnyModel ? 'Search models…' : 'No models connected';
  }

  if (!hasAnyModel) return;

  const byId = new Map();
  all.forEach((m: ModelInfo) => {
    if (!byId.has(m.mid)) byId.set(m.mid, m);
  });

  const favs = favorites;
  const seen = new Set<string>();

  function _addSection(label: string): void {
    const el = document.createElement('div');
    el.className = 'mp-section-label';
    el.textContent = label;
    listEl.appendChild(el);
  }

  function _addEmpty(text: string): void {
    const empty = document.createElement('div');
    empty.className = 'model-switch-empty';
    empty.textContent = text;
    listEl.appendChild(empty);
  }

  function _addRow(m: {
    stale: any;
    staleReason: any;
    mid: any;
    display: string | null;
    epName: string;
  }): void {
    const row = document.createElement('div');
    row.className = 'model-switch-item';
    if (m.stale) {
      row.classList.add('model-switch-stale');
      row.style.opacity = '0.45';
      row.title = `Local server appears offline: ${m.staleReason}. Click to try anyway, or relaunch in Cookbook.`;
    }

    const _mlogo = providerLogo(m.mid);
    if (_mlogo) {
      const logoSpan = document.createElement('span');
      logoSpan.className = 'provider-logo';
      logoSpan.style.opacity = '0.6';
      logoSpan.innerHTML = _mlogo;
      row.appendChild(logoSpan);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'mp-model-name';
    nameSpan.textContent = m.display;
    nameSpan.title = m.display;
    row.appendChild(nameSpan);

    const epSpan = document.createElement('span');
    epSpan.className = 'model-switch-ep';
    const _epDisplay =
      m.epName &&
      !m.display
        .toLowerCase()
        .includes(m.epName.toLowerCase().split('/').pop() || '')
        ? m.epName
        : '';
    epSpan.textContent = _epDisplay;
    row.appendChild(epSpan);

    const favDot = document.createElement('button');
    favDot.type = 'button';
    favDot.className = 'mp-fav-dot' + (favs.includes(m.mid) ? ' active' : '');
    favDot.textContent = '●';
    favDot.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowFav = toggleFavorite(m.mid);
      favDot.classList.toggle('active', nowFav);
      favDot.classList.remove('pulse');
      void favDot.offsetWidth;
      favDot.classList.add('pulse');
    });
    row.appendChild(favDot);

    row.addEventListener('click', () => _pick(m));
    listEl?.appendChild(row);
  }

  // Search mode
  if (q) {
    const matches = all.filter((m: ModelInfo) => {
      const provName = providerDisplayName(providerSlug(m.mid)).toLowerCase();
      return [m.mid, m.display, m.epName, m.providerText, provName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    if (matches.length === 0) _addEmpty('No matching models');
    else matches.forEach(_addRow);
    return;
  }

  // Browse mode
  const BROWSE_ALL_LIMIT = 12;
  const favModels = favs.map((id) => byId.get(id)).filter(Boolean);

  if (favModels.length) {
    _addSection('Favorites');
    favModels.forEach((m: ModelInfo) => {
      if (seen.has(m.mid)) return;
      seen.add(m.mid);
      _addRow(m);
    });
  }

  if (all.length > BROWSE_ALL_LIMIT) {
    const recentModels = _loadRecent()
      .map((id) => byId.get(id))
      .filter(Boolean)
      .filter((m: ModelInfo) => !seen.has(m.mid))
      .slice(0, 5);

    if (recentModels.length) {
      _addSection('Recent');
      recentModels.forEach((m: ModelInfo) => {
        if (seen.has(m.mid)) return;
        seen.add(m.mid);
        _addRow(m);
      });
    }
  }

  if (all.length <= BROWSE_ALL_LIMIT) {
    const rest = all.filter((m: ModelInfo) => !seen.has(m.mid));
    if (rest.length) {
      if (seen.size) _addSection('All models');
      rest.forEach(_addRow);
    }
  }
}

const helper = {
  getAllModels,
  loadFavorites,
  loadModels,
  loadRecent,
  modelExists,
  PROVIDER_NAMES,
  providerDisplayName,
  providerSlug,
  saveRecent,
  sortModelObjects,
  toggleFavorite
};
export default helper;
