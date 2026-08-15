import {
  type EndpointInfo,
  isLoading, //?
  type ModelInfo,
  modelItems,
  refreshModels, //f
} from '$lib/components/chat/models/modelItemStore.svelte';
import { sortModelObjects } from '$lib/legacy/modelSort.js';

interface LocalProbeResult {
  alive: boolean;
  latency_ms?: number;
  error?: string;
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
let localProbe = $state<Record<string,LocalProbeResult>>({});

export function getLocalProbe() {
  return localProbe;
}

export function setLocalProbe(val: Record<string,LocalProbeResult>) {
  localProbe = val;
}

export function pushRecent(mid: string) {
  if (!mid) return;
  const next = _loadRecent().filter((x) => x !== mid);
  next.unshift(mid);
  _saveList(RECENT_KEY, next.slice(0, RECENT_MAX));
}

function modelExists(modelId: string, url: string) {
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

export function providerGroupKey(m: ModelInfo) {
  if (m && m.category && m.category !== 'local' && m.epName) {
    return `~endpoint:${m.epName}`;
  }
  return providerSlug((m && m.mid) || '');
}
export function providerGroupName(key: string) {
  if (String(key || '').startsWith('~endpoint:'))
    return String(key).slice('~endpoint:'.length);
  return providerDisplayName(key);
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
  items.forEach((item : EndpointInfo) => {
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
    const probeResult = item.endpoint_id ? localProbe[item.endpoint_id] : null;
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

const helper = {
  getAllModels,
  loadFavorites,
  loadModels,
  loadRecent,
  modelExists,
  PROVIDER_NAMES,
  providerDisplayName,
  providerGroupKey,
  providerGroupName,
  providerSlug,
  pushRecent,
  saveRecent,
  sortModelObjects,
  toggleFavorite,
};
export default helper;
