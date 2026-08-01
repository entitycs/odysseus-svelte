<script lang="ts">
import { onMount } from 'svelte';
// In same order as original <script> tags:
import * as admin from '$lib/legacy/admin.js';
import * as app from '$lib/legacy/app.js';
import * as assistant from '$lib/legacy/assistant.js';
import * as calendar from '$lib/legacy/calendar.js';
import * as censor from '$lib/legacy/censor.js';
import * as chat from '$lib/legacy/chat.js';
import * as chatRenderer from '$lib/legacy/chatRenderer.js';
import * as chatStream from '$lib/legacy/chatStream.js';
import * as codeRunner from '$lib/legacy/codeRunner.js';
import * as compare from '$lib/legacy/compare/index.js';
import * as cookbook from '$lib/legacy/cookbook.js';
import * as cookbookRunning from '$lib/legacy/cookbookRunning';
import * as cookbookSchedule from '$lib/legacy/cookbookSchedule.js';
import * as documentModule from '$lib/legacy/document.js';
import * as dragSort from '$lib/legacy/dragSort.js';
import * as emailInbox from '$lib/legacy/emailInbox';
import * as emailLibrary from '$lib/legacy/emailLibrary';
import * as fileHandler from '$lib/legacy/fileHandler.js';
import * as gallery from '$lib/legacy/gallery.js';
import * as initModule from '$lib/legacy/init.js';
import * as markdown from '$lib/legacy/markdown.js';
import * as memory from '$lib/legacy/memory.js';
import * as models from '$lib/legacy/models.js';
import * as presets from '$lib/legacy/presets.js';
import * as rag from '$lib/legacy/rag.js';
import * as search from '$lib/legacy/search.js';
import * as searchChat from '$lib/legacy/search-chat.js';
import * as sessions from '$lib/legacy/sessions.js';
import * as settings from '$lib/legacy/settings.js';
import * as skills from '$lib/legacy/skills.js';
import * as spinner from '$lib/legacy/spinner.js';
import * as storage from '$lib/legacy/storage.js';
import * as theme from '$lib/legacy/theme.js';
import * as tourAutoPlay from '$lib/legacy/tourAutoplay.js';
import * as tourHints from '$lib/legacy/tourHints.js';
import * as ttsAi from '$lib/legacy/tts-ai.js';
import * as ui from '$lib/legacy/ui.js';
import * as voiceRecorder from '$lib/legacy/voiceRecorder.js';
// end legacy

let { children } = $props();

onMount(async () => {
  // Call init() in the same order as the original script tags.
  // If a module has no init(), this call is harmless.
  storage.init?.();
  ui.init?.();
  markdown.init?.();
  dragSort.init?.();
  sessions.init?.();
  memory.init?.();
  skills.init?.();
  tourAutoPlay.init?.();
  tourHints.init?.();
  fileHandler.init?.();
  voiceRecorder.init?.();
  models.init?.();
  rag.init?.();
  presets.init?.();
  search.init?.();
  spinner.init?.();
  ttsAi.init?.();
  documentModule.init?.();
  gallery.init?.();
  await calendar.init?.();
  chatRenderer.init?.();
  codeRunner.init?.();
  chatStream.init?.();
  chat.init?.();
  cookbookRunning.init?.();
  cookbook.init?.();
  cookbookSchedule.init?.();
  searchChat.init?.();
  compare.init?.();
  theme.init?.();
  censor.init?.();
  settings.init?.();
  admin.init?.();
  assistant.init?.();
  emailLibrary.init?.();
  emailInbox.init?.();
  app.init?.();
  await initModule.init?.();
  app.startOdysseusApp();
});
</script>
{@render children()}
<div>
</div>
<div id="welcome-screen">
   <div class="welcome-name">
      <svg class="welcome-boat" viewBox="0 0 32 32">
         <path d="M16 4L16 22L6 22Z" fill="currentColor"/>
         <path d="M16 8L16 22L24 22Z" fill="currentColor" opacity="0.6"/>
         <path d="M4 24Q10 20 16 24Q22 28 28 24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>
      Odysseus
   </div>
   <div class="welcome-sub" id="welcome-sub">Welcome, <span class="setup-trigger-link" style="color:var(--accent,var(--red));font-weight:600;cursor:pointer;text-decoration:underline;" title="Click to launch setup">type /setup</span> to get started.</div>
   <div class="welcome-tip" id="welcome-tip"></div>
   <button type="button" class="incognito-btn" id="incognito-btn" title="Enable Nobody mode — no memory, no history saved">
      <svg class="eye-open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
         <circle cx="12" cy="12" r="3"/>
      </svg>
      <svg class="eye-blinded" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
         <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
         <line x1="8" y1="16" x2="16" y2="8"/>
         <line x1="8" y1="8" x2="16" y2="16"/>
      </svg>
      <span class="incognito-label">Nobody</span>
   </button>
   <div id="welcome-setup" style="display:none"></div>
</div>
