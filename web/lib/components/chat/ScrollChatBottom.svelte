<script lang="ts">
import { onMount } from 'svelte';

/**
 * ScrollChatBottom
 *
 * Renders the floating ▼ button that appears when the user scrolls up in the
 * chat history, and animates the scroll back to the bottom on click.
 *
 * The component queries #chat-history and .chat-input-bar from the DOM on
 * mount — those elements still live in +layout.svelte while the chat UI
 * is being progressively migrated.  Once the chat area becomes its own
 * Svelte component, prefer passing the elements as props instead.
 *
 * CSS for .scroll-nav-btn, .show, and .slide-out lives in static/style.css
 * (global, theme-aware).  The component keeps the same id="scroll-bottom-btn"
 * so existing CSS selectors keep working without change.
 */
let btnEl = $state<HTMLButtonElement | null>(null);
onMount(() => {
  const container = document.getElementById(
    'chat-history',
  ) as HTMLElement | null;
  const chatBar = document.querySelector(
    '.chat-input-bar',
  ) as HTMLElement | null;

  const bottomBtn = btnEl;
  if (!container || !chatBar || !bottomBtn) return;

  // ── Position ────────────────────────────────────────────────────────────
  function reposition() {
    const barRect = chatBar!.getBoundingClientRect();
    bottomBtn!.style.bottom = window.innerHeight - barRect.top + 16 + 'px';
    bottomBtn!.style.right = window.innerWidth - barRect.right + 8 + 'px';
  }

  // ── Visibility ──────────────────────────────────────────────────────────
  function update() {
    reposition();
    const scrollable = container.scrollHeight > container.clientHeight + 10;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      300;
    if (scrollable && !atBottom) {
      bottomBtn!.classList.remove('slide-out');
      bottomBtn!.classList.add('show');
    } else if (bottomBtn!.classList.contains('show')) {
      bottomBtn!.classList.add('slide-out');
      bottomBtn!.classList.remove('show');
    }
  }

  // ── Smooth scroll ───────────────────────────────────────────────────────
  let _scrollRaf: number | null = null;
  let _scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let _scrollingToBottom = false;
  function cancelAutoScroll() {
    if (_scrollRaf) {
      cancelAnimationFrame(_scrollRaf);
      _scrollRaf = null;
    }
    if (_scrollTimeout) {
      clearTimeout(_scrollTimeout);
      _scrollTimeout = null;
    }
    _scrollingToBottom = false;
  }

  function scrollToBottom() {
    cancelAutoScroll();
    const target = container.scrollHeight - container.clientHeight;
    _scrollingToBottom = true;
    function step() {
      if (!_scrollingToBottom) return;
      const diff = target - container.scrollTop;
      if (diff <= 8) {
        container.scrollTop = target;
        _scrollingToBottom = false;
        return;
      }
      container.scrollTop += diff * 0.2;
      _scrollRaf = requestAnimationFrame(step);
    }
    step();
    // Safety fallback — snap if rAF loop stalls
    _scrollTimeout = setTimeout(() => {
      if (_scrollingToBottom) {
        container.scrollTop = target;
        _scrollingToBottom = false;
      }
    }, 1500);
  }
  // ── Event listeners ─────────────────────────────────────────────────────
  const onWheel = () => {
    if (_scrollingToBottom) cancelAutoScroll();
  };
  const onTouch = () => {
    if (_scrollingToBottom) cancelAutoScroll();
  };
  container.addEventListener('scroll', update, { passive: true });
  container.addEventListener('wheel', onWheel, { passive: true });
  container.addEventListener('touchstart', onTouch, { passive: true });
  bottomBtn.addEventListener('click', scrollToBottom);
  // ── Observers ───────────────────────────────────────────────────────────
  const resizeObs = new ResizeObserver(reposition);
  resizeObs.observe(chatBar);
  const mutObs = new MutationObserver(update);
  mutObs.observe(container, { childList: true, subtree: true });
  window.addEventListener('resize', reposition);
  update();
  // ── Cleanup (returned from onMount, called on component destroy) ────────
  return () => {
    container.removeEventListener('scroll', update);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('touchstart', onTouch);
    bottomBtn.removeEventListener('click', scrollToBottom);
    resizeObs.disconnect();
    mutObs.disconnect();
    window.removeEventListener('resize', reposition);
    cancelAutoScroll();
  };
});
</script>
<button
	bind:this={btnEl}
	id="scroll-bottom-btn"
	class="scroll-nav-btn"
	title="Scroll to bottom"
	aria-label="Scroll to bottom"
>▼</button>
