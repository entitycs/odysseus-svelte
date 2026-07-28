import { matchModelKey } from '$lib/legacy/model/matchKey.js';
import { MODEL_INFO } from '$lib/legacy/model/shared.js';
import { toTrimmedString } from '$lib/legacy/util/format.js';
import { shortEndpointLabel } from './endpoint';

// --- data -------------------------------------------------------------------/

export function shortModel(name) {
  if (!name) return '...';
  if (typeof name !== 'string') name = String(name);
  let short = name.split('/').pop();
  // Strip .gguf extension
  short = short.replace(/\.gguf$/i, '');
  // Strip quantization suffixes (Q4_K_M, Q8_0, etc.) and shard numbers
  short = short.replace(/-0000\d-of-\d+$/, '');
  short = short.replace(/[-_](Q\d[_A-Z\d]*|F16|F32|BF16|fp16|fp32)$/i, '');
  // Truncate if still too long (keep first meaningful part)
  if (short.length > 25) {
    // Try to find a natural break point (dash after model size like -35B or -7B)
    const sizeMatch = short.match(/^(.+?-\d+[BbMm])/);
    if (sizeMatch) short = sizeMatch[1];
    else short = short.substring(0, 22) + '…';
  }
  return short;
}

export function sameModelName(left, right) {
  const a = toTrimmedString(left);
  const b = toTrimmedString(right);
  if (!a || !b) return false;
  return (
    a.toLowerCase() === b.toLowerCase() ||
    shortModel(a).toLowerCase() === shortModel(b).toLowerCase()
  );
}

export function modelRouteLabel(
  requestedModel,
  actualModel,
  requestedEndpointLabel = '',
  actualEndpointLabel = '',
  requestedEndpointId = '',
  actualEndpointId = '',
) {
  const requested = toTrimmedString(requestedModel);
  const actual = toTrimmedString(actualModel) || requested;
  const requestedRoute = toTrimmedString(requestedEndpointId || requestedEndpointLabel);
  const actualRoute = toTrimmedString(actualEndpointId || actualEndpointLabel);
  const routeChanged = Boolean(
    actualRoute
    && requestedRoute
    && actualRoute !== requestedRoute
  );
  if (!requested || sameModelName(requested, actual)) {
    const model = shortModel(actual || requested);
    if (!routeChanged) return model;
    const from = shortEndpointLabel(requestedEndpointLabel || 'Selected route');
    const to = shortEndpointLabel(actualEndpointLabel || actualEndpointId);
    return model + ' (' + from + ' -> ' + to + ')';
  }
  return shortModel(requested) + ' -> ' + shortModel(actual);
}

export function replyModelPair(modelName, metadata) {
  const meta = metadata || {};
  const actualFromMeta = toTrimmedString(meta.model || meta.actual_model);
  const requestedFromMeta = toTrimmedString(meta.requested_model || meta.selected_model);
  if (actualFromMeta || requestedFromMeta) {
    const actual = actualFromMeta || requestedFromMeta || toTrimmedString(modelName);
    const requested = requestedFromMeta || actual;
    return {
      requestedModel: requested,
      actualModel: actual,
      requestedEndpointId: meta.requested_endpoint_id || null,
      requestedEndpointLabel: meta.requested_endpoint_label || 'Selected route',
      actualEndpointId: meta.endpoint_id || null,
      actualEndpointLabel: meta.endpoint_label || meta.requested_endpoint_label || 'Selected route',
    };
  }
  const fallback = toTrimmedString(modelName);
  return {
    requestedModel: fallback,
    actualModel: fallback,
    requestedEndpointId: null,
    requestedEndpointLabel: 'Selected route',
    actualEndpointId: null,
    actualEndpointLabel: 'Selected route',
  };
}

/**
 * Generate a consistent HSL color for a model name.
 * Returns an hsl() string. The hue is derived from a string hash,
 * saturation and lightness are fixed for readability on dark/light themes.
 */
export function modelColor(name) {
  if (!name) return null;
  const key = name.toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 55%, 65%)`;
}

/** Look up model info (pricing + context) by substring match */
export function getModelInfo(modelName) {
  if (!modelName) return null;
  const key = matchModelKey(modelName, Object.keys(MODEL_INFO));
  return key ? { key, ...MODEL_INFO[key] } : null;
}
