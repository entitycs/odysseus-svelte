import { loadToggleState, saveToggleState } from "./legacy/storage";
import uiModule from "./legacy/ui";

function _modeKey(stateKey, mode) {
    return `${stateKey}_${mode}`;
}

export function loadToolPref(stateKey, mode) {
    const state = loadToggleState();
    const key = _modeKey(stateKey, mode);
    if (Object.hasOwn(state, key)) return !!state[key];
    return mode === 'agent'; // default: ON in agent, OFF in chat
}

export function saveToolPref(stateKey, mode, value) {
    const state = loadToggleState();
    state[_modeKey(stateKey, mode)] = value;
    saveToggleState(state);
}

export const TOOL_TOGGLE_TOAST_LABELS = {
    web: 'Web search',
    bash: 'Shell',
};

export function showToolToggleToast(stateKey, active) {
    const label = TOOL_TOGGLE_TOAST_LABELS[stateKey];
    if (!label || !uiModule?.showToast) return;
    uiModule.showToast(`${label} ${active ? 'on' : 'off'}`, 1800);
}
