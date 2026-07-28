import { matchModelKey } from '$lib/legacy/model/matchKey.js';
import { MODEL_INFO as MODEL_PRICING } from '$lib/legacy/model/shared.js';
import { getCurrentEndpointUrl, isCostTrackedEndpoint } from './endpoint';

// Image generation cost lookup (per-image, by model × quality × size)
const IMAGE_PRICING = {
  'gpt-image-1.5': {
    low: { '1024x1024': 0.009, '1024x1536': 0.013, '1536x1024': 0.013 },
    medium: { '1024x1024': 0.034, '1024x1536': 0.05, '1536x1024': 0.05 },
    high: { '1024x1024': 0.133, '1024x1536': 0.2, '1536x1024': 0.2 },
  },
  'gpt-image-1': {
    low: { '1024x1024': 0.011, '1024x1536': 0.016, '1536x1024': 0.016 },
    medium: { '1024x1024': 0.042, '1024x1536': 0.063, '1536x1024': 0.063 },
    high: { '1024x1024': 0.167, '1024x1536': 0.25, '1536x1024': 0.25 },
  },
  'gpt-image-1-mini': {
    low: { '1024x1024': 0.005, '1024x1536': 0.006, '1536x1024': 0.006 },
    medium: { '1024x1024': 0.011, '1024x1536': 0.015, '1536x1024': 0.015 },
    high: { '1024x1024': 0.036, '1024x1536': 0.052, '1536x1024': 0.052 },
  },
};

export function getModelCost(modelName, inputTokens, outputTokens) {
  if (!modelName) return null;
  const key = matchModelKey(modelName, Object.keys(MODEL_PRICING));
  if (!key) return null;
  const price = MODEL_PRICING[key];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

export function getImageCost(model, quality, size) {
  if (!model) return null;
  const m = model.toLowerCase();
  for (const [key, quals] of Object.entries(IMAGE_PRICING)) {
    if (m.includes(key)) {
      const q = quals[(quality || 'medium').toLowerCase()] || quals['medium'];
      return q ? q[size] || q['1024x1024'] || null : null;
    }
  }
  return null;
}

/** Cost for the current turn, returning null for non-billable endpoints. */
function _billableCost(model, inputTokens, outputTokens, endpointCostTracked, selectedEndpointUrl) {
  // Foreground fallback can answer on a different endpoint than the session's
  // selected route. Prefer the backend's non-secret actual-route
  // classification; retain the selected-endpoint check for older history.
  if (endpointCostTracked === false) return null;
  const selectedUrl = selectedEndpointUrl === undefined
    ? getCurrentEndpointUrl()
    : selectedEndpointUrl;
  if (endpointCostTracked !== true && !isCostTrackedEndpoint(selectedUrl)) {
    return null;
  }
  return getModelCost(model, inputTokens, outputTokens);
}

/** Sum cost using the route/model that produced each Agent round. */
export function metricsBillableCost(metrics, model, inputTokens, outputTokens, selectedEndpointUrl) {
  const buckets = Array.isArray(metrics.usage_buckets) ? metrics.usage_buckets : [];
  if (!buckets.length) {
    return _billableCost(
      model,
      inputTokens,
      outputTokens,
      metrics.endpoint_cost_tracked,
      selectedEndpointUrl,
    );
  }
  let total = 0;
  let hasPricedUsage = false;
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== 'object') continue;
    const bucketCost = _billableCost(
      bucket.model || model,
      Number(bucket.input_tokens) || 0,
      Number(bucket.output_tokens) || 0,
      bucket.endpoint_cost_tracked,
      selectedEndpointUrl,
    );
    if (bucketCost === null) continue;
    total += bucketCost;
    hasPricedUsage = true;
  }
  return hasPricedUsage ? total : null;
}
