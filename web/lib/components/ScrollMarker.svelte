<script lang="ts">
  import { springSlide } from "$lib/transitions/springSlide";
  export interface Props {
    message: HTMLElement | null;
    className?: string;
    dataMarkerId: number;
    top: number;
    scrollTop: number;
    isVisible: boolean;
    onclick: (e: Event, top: number) => void;
  }

  let {
    message = null,
    className = "",
    dataMarkerId = 0,
    top = 0,
    scrollTop = 0,
    isVisible = false,
    onclick = () => {},
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  role="button"
  transition:springSlide={{ duration: 600, overshoot: 45 }}
  tabindex="0"
  class="scrollMarker {className}{isVisible ? ' active' : ''}"
  data-marker-id={`msg-${dataMarkerId}`}
  style="top:{top}px"
  onclick={(e) => onclick(e, scrollTop)}
  onkeydown={(e) => {
    if (e.key == "Enter" || e.key === " ") onclick(e, scrollTop);
  }}
></div>

<style>
  /* Markers themselves need pointer-events to be clickable. */
  .scroll-marker {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 17px;
    height: 3px;
    border-radius: 20%;
    background: var(--red, #4f8ef7);
    opacity: 0.7;
    cursor: pointer;
    pointer-events: auto;
    transition:
      opacity 0.35s ease,
      transform 0.3s ease;
  }

  /* Active/hover state via JavaScript - markers scroll into view */
  .scroll-marker.active {
    opacity: 1;
    transform: translateX(-50%) scale(1.35, 2);
    background: color-mix(in srgb, var(--red) 80%, var(--fg) 20%);
  }

  @media (width>=480px) {
    .scroll-marker {
      height: 5px;
    }
    .scroll-marker.active {
      transform: translateX(-50%) scale(1.25, 2);
    }
  }

  @media (width>=768px) {
    .scroll-marker {
      height: 8px;
    }
  }

  @media (width>=1024px) {
    .scroll-marker {
      height: 10px;
    }
  }
</style>
