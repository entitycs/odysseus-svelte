import Storage from '$lib/legacy/storage.js';
import { updatePlusDot } from '../overflow';
/** Sync Group Chat indicator button + overflow. */
export function syncGroupIndicator(active) {
    const btn = document.getElementById('group-toggle-btn');
    const overflow = document.getElementById('overflow-group-btn');
    const chk = document.getElementById('group-toggle');
    if (btn) {
        btn.style.display = active ? '' : 'none';
        btn.classList.toggle('active', active);
    }
    if (overflow) {
        overflow.classList.toggle('active', active);
        overflow.style.display = active ? 'none' : '';
    }
    if (chk) chk.checked = active;
    // Hide/show model picker
    const _mpw = document.getElementById('model-picker-wrap');
    if (_mpw) _mpw.style.display = active ? 'none' : '';
    // Mutual exclusion: group disables research + web search
    if (active) {
        _syncResearchIndicator(false);
        const _webChk = document.getElementById('web-toggle');
        if (_webChk && _webChk.checked) {
            _webChk.checked = false;
            saveToolPref('web', loadToggleState().mode || 'chat', false);
        }
    }
    const s = loadToggleState();
    s.group = active;
    Storage.saveToggleState(s);
    updatePlusDot();
    document.dispatchEvent(new CustomEvent('overflow-state-change'));

    // Update welcome screen for research mode
    const ws = document.getElementById('welcome-screen');
    const welcomeName = document.querySelector('.welcome-name');
    const welcomeSub = document.getElementById('welcome-sub');
    const tipEl = document.getElementById('welcome-tip');
    const _resIco =
        '<svg class="welcome-boat" style="position:relative;top:0.5px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    if (active) {
        if (welcomeName) {
            if (!welcomeName.dataset.researchOrigHtml)
                welcomeName.dataset.researchOrigHtml = welcomeName.innerHTML;
            welcomeName.innerHTML = _resIco + 'Deep Research';
        }
        if (welcomeSub) {
            if (!welcomeSub.dataset.researchOrigText)
                welcomeSub.dataset.researchOrigText = welcomeSub.textContent;
            welcomeSub.textContent =
                'Deep multi-step research with source gathering and synthesis.';
        }
        if (tipEl) {
            if (!tipEl.dataset.researchOrigTip)
                tipEl.dataset.researchOrigTip = tipEl.textContent;
            tipEl.textContent = '';
            tipEl.style.display = 'none';
        }
        // Hide Nobody toggle during research mode
        const _incBtn = document.getElementById('incognito-btn');
        if (_incBtn) {
            _incBtn.dataset.researchOrigDisplay = _incBtn.style.display;
            _incBtn.style.display = 'none';
        }
        // Close document panel if open
        if (window.documentModule && window.documentModule.isPanelOpen()) {
            window.documentModule.closePanel();
        }
    } else {
        if (welcomeName && welcomeName.dataset.researchOrigHtml) {
            welcomeName.innerHTML = welcomeName.dataset.researchOrigHtml;
            delete welcomeName.dataset.researchOrigHtml;
        }
        if (welcomeSub && welcomeSub.dataset.researchOrigText) {
            welcomeSub.textContent = welcomeSub.dataset.researchOrigText;
            delete welcomeSub.dataset.researchOrigText;
        }
        if (tipEl && tipEl.dataset.researchOrigTip) {
            tipEl.textContent = tipEl.dataset.researchOrigTip;
            tipEl.style.opacity = '';
            tipEl.style.display = '';
            delete tipEl.dataset.researchOrigTip;
        }
        // Restore Nobody toggle
        const _incBtn2 = document.getElementById('incognito-btn');
        if (_incBtn2 && _incBtn2.dataset.researchOrigDisplay !== undefined) {
            _incBtn2.style.display = _incBtn2.dataset.researchOrigDisplay;
            delete _incBtn2.dataset.researchOrigDisplay;
        }
    }
    if (ws) {
        ws.style.animation = 'none';
        ws.offsetHeight;
        ws.style.animation = 'welcome-enter 0.3s ease-out both';
    }
}
