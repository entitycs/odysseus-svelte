<script lang="ts">
  import { onMount } from "svelte";
  import ScrollMarker, {
    type Props as ScrollMarkerProps,
  } from "$lib/components/ScrollMarker.svelte";

  // ScrollMarker component
  //
  // Watches #chat-history for content mutations and container resizes, then
  // renders small clickable pills alongside the native scrollbar — one per
  // .msg-user element — so the user can jump directly to any user turn.

  // --- Props -----------------------------------------------------------
  interface Props {
    chat: HTMLElement | null;
    /** CSS selector for the scrollable chat container. */
    chatSelector?: string;
    /** CSS selector for the message elements to mark. */
    msgSelector?: string;
    /** Debounce delay (ms) before redrawing after a mutation / resize. */
    debounceMs?: number;
  }
  let {
    chat = null,
    msgSelector = ".msg-user",
    debounceMs = 300,
  }: Props = $props();

  // --- DOM refs --------------------------------------------------------
  let trackEl = $state<HTMLDivElement>();

  // --- State data ------------------------------------------------------
  let msgs = $state<NodeListOf<HTMLElement>>();
  let markers = $state<ScrollMarkerProps[]>([]);

  let _isOnTimeout = false;
  // --- on Mount --------------------------------------------------------
  onMount(async () => {
    if (!trackEl) return;
    init(trackEl); // ignoring return value when not in $effect
  });

  // --- Events ----------------------------------------------------------
  const onMarkerClick = (e: Event, top: number) => {
    if (!chat) return;
    chat.scrollTo({ top: top, behavior: "smooth" });
  };

  // $effect(() => {
  //   if (!trackEl || !chat || !!!msgs || msgs.length === 0) return;

  //   const scrollRange = chat.scrollHeight - chat.clientHeight;
  //   if (scrollRange <= 0) {
  //     markers.splice(0, markers.length);
  //     return;
  //   }

  //   const trackHeight = trackEl.clientHeight || chat.clientHeight;
  //   const thumbHeight = (chat.clientHeight / chat.scrollHeight) * trackHeight;
  //   const usableTrack = trackHeight;

  //   markers = Array.from(msgs).map((msg, index) => {
  //     if (!trackEl) throw new EvalError("track element not found");
  //     const chatRect = chat.getBoundingClientRect();
  //     const msgRect = msg.getBoundingClientRect();

  //     const msgTopInScrollSpace = msgRect.top - chatRect.top + chat.scrollTop;

  //     let desiredScrollTop = msgTopInScrollSpace - chat.clientHeight / 2;
  //     desiredScrollTop = Math.max(0, Math.min(desiredScrollTop, scrollRange));

  //     const markerY =
  //       (msgTopInScrollSpace / scrollRange) * usableTrack - thumbHeight / 2;

  //     const marker: ScrollMarkerProps = {
  //       message: msg,
  //       dataMarkerId: index,
  //       className: "scroll-marker",
  //       top: markerY,
  //       scrollTop: desiredScrollTop,
  //       onclick: (e) => onMarkerClick(e, desiredScrollTop),
  //       isVisible: false,
  //     };
  //     return marker;
  //   });
  // });

  // --- Core logic (mirrors the original plugin) ------------------------

  function positionTrack(): void {
    if (!chat || !trackEl) return;

    const trackHeight = trackEl.clientHeight || chat.clientHeight;
    const thumbHeight = (chat.clientHeight / chat.scrollHeight) * trackHeight;

    const ua = navigator.userAgent.toLowerCase();
    const hasNoArrows = true; //for all -- use first/last markers
    // ua.includes('macintosh') ||
    // ua.includes('ipad') ||
    // ua.includes('iphone') ||
    // ua.includes('android');

    const yMargin = (hasNoArrows ? 0 : 16) + thumbHeight / 2;
    const xMargin = 6;
    const rect = chat.getBoundingClientRect();

    trackEl.style.position = "fixed";
    trackEl.style.top = `${rect.top + yMargin}px`;
    trackEl.style.left = `${rect.right - xMargin}px`;
    trackEl.style.width = "20px";
    trackEl.style.height = `${rect.height - 2 * yMargin}px`;
  }
  let _scrollHandler: (() => void) | null = null;
  /**
   * Add scroll handler to chat container to detect when markers come into view
   */
  function addScrollHandler(): () => void {
    if (!chat || !trackEl) return () => {};
    const handleScroll = () => {
      if (!chat || !trackEl) return;

      // Find which markers are currently within viewport (threshold: 15% from edges)
      const visibleThreshold = chat.clientHeight * 0.1;
      const chatRect = chat.getBoundingClientRect();

      // const msgs = chat.querySelectorAll<HTMLElement>(msgSelector);
      markers.forEach((marker, index) => {
        const markedEl = marker.message;
        const markerRect = markedEl.getBoundingClientRect(); //marker.getBoundingClientRect();
        const isVisible =
          (markerRect.top <= chatRect.top &&
            markerRect.bottom >= chatRect.bottom) ||
          (markerRect.top >= chatRect.top + visibleThreshold &&
            markerRect.top <= chatRect.bottom - visibleThreshold) ||
          (markerRect.bottom >= chatRect.top + visibleThreshold &&
            markerRect.bottom <= chatRect.bottom - visibleThreshold);
        marker.isVisible = isVisible;
      });
    };

    chat.addEventListener("scrollend", handleScroll, { passive: true });

    return () => {
      chat?.removeEventListener("scrollend", handleScroll);
    };
  }

  function drawMarkers(): void {
    if (!chat || !trackEl) return;

    positionTrack();

    const scrollRange = chat.scrollHeight - chat.clientHeight;
    if (scrollRange <= 0) {
      markers.splice(0, markers.length);
      return;
    }

    const trackHeight = trackEl.clientHeight || chat.clientHeight;
    const thumbHeight = (chat.clientHeight / chat.scrollHeight) * trackHeight;
    const usableTrack = trackHeight;

    // track.innerHTML = "";

    msgs = chat.querySelectorAll<HTMLElement>(msgSelector);
    markers.splice(0, markers.length);
    msgs.forEach((msg, index) => {
      if (!chat) return;
      const chatRect = chat.getBoundingClientRect();
      const msgRect = msg.getBoundingClientRect();

      const msgTopInScrollSpace = msgRect.top - chatRect.top + chat.scrollTop;

      let desiredScrollTop = msgTopInScrollSpace - chat.clientHeight / 2;
      desiredScrollTop = Math.max(0, Math.min(desiredScrollTop, scrollRange));

      const markerY =
        (msgTopInScrollSpace / scrollRange) * usableTrack - thumbHeight / 2;

      const marker: ScrollMarkerProps = {
        message: msg,
        dataMarkerId: index,
        className: "scroll-marker",
        top: markerY,
        scrollTop: desiredScrollTop,
        onclick: (e) => onMarkerClick(e, desiredScrollTop),
        isVisible: false,
      };
      markers.push(marker);
      // track.appendChild(marker); // legacy way
    });
  }

  /**
   * Attach all observers and return a cleanup function so that
   * Svelte's $effect can tear everything down when the component unmounts.
   */
  function init(track: HTMLDivElement): () => void {
    if (!chat) return () => {};

    // Ensure the chat element is positioned so child markers can use
    // position:absolute if needed (mirrors the original plugin guard).
    const cs = getComputedStyle(chat);
    if (cs.position === "static") chat.style.position = "relative";

    let redrawTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleDraw = (includePosition = false) => {
      if (redrawTimeout !== null) clearTimeout(redrawTimeout);
      redrawTimeout = setTimeout(() => {
        if (includePosition) positionTrack();
        drawMarkers();
        _isOnTimeout = false;
      }, debounceMs);
      _isOnTimeout = true;
    };

    // --- Container resize ---
    const container = document.querySelector("#chat-container");
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(() => scheduleDraw(true));
      resizeObserver.observe(container);
    }

    // --- Window resize ---
    const onWindowResize = () =>{
      if (!_isOnTimeout){
        drawMarkers();
      }
      scheduleDraw(true);
    }
    window.addEventListener("resize", onWindowResize, { passive: true });

    // --- Content mutations ---
    const mutationObserver = new MutationObserver(
      () => {
        if (!_isOnTimeout){
          drawMarkers();
        }
        scheduleDraw(true);
      }
    );
    mutationObserver.observe(chat, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // --- Scroll handler for hover effect ---
    if (!_scrollHandler) _scrollHandler = addScrollHandler();

    // Initial draw.
    drawMarkers();

    return () => {
      if (redrawTimeout !== null) clearTimeout(redrawTimeout);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      mutationObserver.disconnect();
      _scrollHandler?.();
    };
  }
</script>

<!--
  The track div is appended to #chat-container in the legacy shell.
  bind:this hands the reference to $effect so the imperative logic
  can use it without querySelector('#scroll-marker-track').
-->
<div bind:this={trackEl} id="scroll-marker-track" aria-hidden="true">
  {#each markers as marker, index}
    <ScrollMarker {...marker} />
  {/each}
</div>

<style>
  #scroll-marker-track {
    /* Positioned dynamically by positionTrack(); base styles only. */
    pointer-events: none;
    z-index: 9999;
    display: block;
    transition:
      transform 0.3s ease,
      opacity 0.35s ease;
  }
</style>
