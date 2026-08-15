// models.ts
import { SvelteSet } from 'svelte/reactivity';
import { writable } from 'svelte/store';
import { compareModelObjects } from '$lib/legacy/modelSort';

export interface ModelInfo {
  key: string | null;
  category: string | null;
  display: string | null;
  endpointId: string;
  epName: string;
  mid: string;
  offline: boolean;
  providerText: string;
  stale: boolean;
  staleReason: string | null;
  url: string;
}

export interface EndpointInfo {
  host: string;
  port: number;
  url: string;
  models: any[];
  models_display: string[];
  models_extra: string[];
  models_extra_display: string[];
  endpoint_id: string;
  endpoint_name: string;
  category: string;
  endpoint_kind: string;
  model_type: string;
  status: string;
  ping_error: string | null;
  offline: Boolean;
}

export const modelItems = writable<ModelInfo[]>([]);
export const isLoading = writable(false);

let _lastFetchTime = 0;
let _fetchInflight: Promise<any> | null = null;
let _fetchSeq = 0;

const API_BASE = '';
const _FETCH_CACHE_TTL = 30_000; // 30s

function sortModelObjects(models: ModelInfo[]) {
  return (Array.isArray(models) ? models : [])
    .slice()
    .sort(compareModelObjects);
}
export async function refreshModels(force = false) {
  const now = Date.now();
  const needsFetch =
    force || !_lastFetchTime || now - _lastFetchTime >= _FETCH_CACHE_TTL;

  if (!needsFetch && !force) {
    // Cache is fresh — still re-render UI via store
    return;
  }

  isLoading.set(true);

  try {
    if (force) _fetchInflight = null;

    if (!_fetchInflight) {
      const seq = ++_fetchSeq;
      const url =
        `${API_BASE}/api/models` +
        (force ? '?refresh=true' : '?background=false');

      _fetchInflight = fetch(url, { credentials: 'same-origin' })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return { data, seq };
        })
        .finally(() => {
          _fetchInflight = null;
        });
    }

    const { data, seq } = await _fetchInflight;
    if (seq < _fetchSeq) return;

    _lastFetchTime = Date.now();

    let seen = new SvelteSet();
    let result: ModelInfo[] = [];
    data.items.forEach((item: EndpointInfo) => {
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
      const probeResult = item.endpoint_id
        ? _localProbe[item.endpoint_id]
        : null;
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

    modelItems.set(data.items);
  } catch (err) {
    console.error(err);
    modelItems.set([]);
  } finally {
    isLoading.set(false);
  }
}
