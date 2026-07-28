// ── Overflow "..." menu (Research) ──
export function updatePlusDot() {
    const plusBtn = document.getElementById('overflow-plus-btn');
    if (!plusBtn) return;
    const menu = document.getElementById('overflow-menu');
    const anyActive = menu
        ? Array.from(
            menu.querySelectorAll<HTMLElement>('.overflow-menu-item.active'),
        ).some((item) => item.style.display !== 'none')
        : false;
    plusBtn.classList.toggle('has-active', anyActive);
}
