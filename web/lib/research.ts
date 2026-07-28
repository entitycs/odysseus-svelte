import { loadToggleState, saveToggleState } from "$lib/legacy/storage";
import { saveToolPref } from "$lib/tool";
import { updatePlusDot } from "./overflow";

/** Sync Research indicator button + overflow + tool sidebar active state. */
export function syncResearchIndicator(active) {
    const btn = document.getElementById('research-toggle-btn');
    const overflow = document.getElementById('overflow-research-btn');
    const toolBtn = document.getElementById('tool-research-btn');
    const chk = document.getElementById('research-toggle');
    if (btn) {
        btn.style.display = active ? '' : 'none';
        btn.classList.toggle('active', active);
    }
    // Hide from overflow menu when showing in chatbox (avoid duplicate)
    if (overflow) {
        overflow.classList.toggle('active', active);
        overflow.style.display = active ? 'none' : '';
    }
    if (toolBtn) toolBtn.classList.toggle('active', active);
    if (chk) chk.checked = active;
    // Research disables shell access
    const bashChk = document.getElementById('bash-toggle');
    const bashBtn = document.getElementById('bash-toggle-btn');
    if (active) {
        if (bashChk && bashChk.checked) {
            bashChk.checked = false;
            if (bashBtn) bashBtn.classList.remove('active');
            saveToolPref('bash', loadToggleState().mode || 'chat', false);
        }
    }
    const s = loadToggleState();
    s.research = active;
    saveToggleState(s);
    updatePlusDot();
    document.dispatchEvent(new CustomEvent('overflow-state-change'));
}
