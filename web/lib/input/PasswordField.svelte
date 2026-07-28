<script lang="ts">
// --- Props -----------------------------------------------------------
// All optional; defaults match the original plugin behaviour.
interface Props {
  id: string;
  name?: string;
  /** Debounce delay (ms) before redrawing after a mutation / resize. */
  label?: string;
  placeholder?: string;
  autocomplete?: string;
  inputStyle?: string;
  buttonStyle?: string;
}

let {
  id = 'password',
  name = id,
  label = id.charAt(0).toUpperCase() + id.slice(1),
  placeholder = 'password',
  autocomplete = 'current-password',
  inputStyle = '',
  buttonStyle = '',
}: Props = $props();

const showState = $state({ showing: false });
const policy = $state({ password_min_length: 8 });

const type = $derived(showState.showing ? 'text' : 'password');
const aria = $derived(showState.showing ? 'Hide password' : 'Show password');

let inp: HTMLInputElement;

function toggle(e: Event) {
  e.preventDefault();
  showState.showing = !showState.showing;
}

// Password show/hide toggles
const eyeOpen =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeClosed =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><line x1="8" y1="16" x2="16" y2="8"/><line x1="8" y1="8" x2="16" y2="16"/></svg>';

const _placeholder = $derived(
  policy ? ` (min ${policy.password_min_length})` : '',
);

$effect(() => {
  // inp?.focus();
  // fetch('/api/auth/policy', { credentials: 'same-origin' })
  //   .then((r) => (r.ok ? r.json() : null))
  //   .then((data) => {
  //     if (!data) return;
  //     policy.password_min_length = data.password_min_length;
  //   })
  //   .catch(() => {});
});
</script>

<div class="pw-wrapper">
  <input id={id}
    name={name || id}
    type={type}
    autocomplete="current-password"
    bind:this={inp}
    style={inputStyle}
    placeholder={placeholder + _placeholder}
  />

  <button type="button"
    class="pw-toggle"
    aria-label={aria}
    onclick={(e: Event) =>  toggle(e)}
    tabindex="-1"
    style={buttonStyle}
  >
    {@html showState.showing ? eyeOpen : eyeClosed}
  </button>
</div>
<style>
.pw-wrapper {
    position: relative;
    margin-bottom: 1rem;
}
.pw-wrapper input:not(.remember-check) {
    padding-right: 2.5rem;
    margin-bottom: 0;
}
input:not(.remember-check) {
    width: 100%;
    padding: 0.6rem 0.8rem;
    margin-bottom: 1rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--fg);
    font-size: 0.95rem;
    font-family: 'Fira Code', monospace;
}
.pw-toggle {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(calc(-50% + 1px));
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color:
color-mix(in srgb, var(--fg) 40%, transparent);
    width: auto;
    display: flex;
    align-items: center;
    justify-content: center;
}
.pw-wrapper button {
    height: auto !important;
    width: auto;
    padding: calc(0.7rem + 1px) 0.7rem calc(0.7rem - 1px);
    border: none;
    border-radius: 6px;
    /* background: */
/* color-mix(in srgb, var(--red) 78%, #000); */
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 600;
    font-family: 'Fira Code', monospace;
}
.pw-wrapper button:hover { background: color-mix(in srgb, var(--red) 66%, black); }
.pw-wrapper button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
