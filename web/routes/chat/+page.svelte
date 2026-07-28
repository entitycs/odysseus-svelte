<script lang="ts">
   import { onMount } from "svelte";
   import { afterNavigate } from "$app/navigation";
   import { syncGroupIndicator } from "$lib/chat/group";
   import { handleSubmit } from "$lib/chat/helpers";
   import MessageInput from "$lib/components/chat/MessageInput.svelte";
   import ScrollChatBottom from "$lib/components/chat/ScrollChatBottom.svelte";
   import { deEmojify } from "$lib/emoji";
   import chatModule from "$lib/legacy/chat";
   import documentModule from "$lib/legacy/document";
   import fileHandlerModule from "$lib/legacy/fileHandler";
   import groupModule from "$lib/legacy/group";
   import presetsModule from "$lib/legacy/presets";
   import * as researchPanelModule from "$lib/legacy/research/panel.js";
   import * as sessionModule from "$lib/legacy/sessions";
   import uiModule from "$lib/legacy/ui";
   import { updatePlusDot } from "$lib/overflow";
   import UserMsgScrollMarker from "$lib/components/UserMsgScrollMarker.svelte";
   import { page } from "$app/state";

   let chatHistory: HTMLElement;

   const _DEOJ_SKIP = ".sources-section, .thinking-toggle, .memory-used-pill";

   /**
    * @param {string} id
    */
   function el(id: string) {
      return document.getElementById(id);
   }

   afterNavigate((navigation) => {
      const hashId = window.location.hash.replace("#", "");
      if (hashId) sessionModule.selectSession(hashId);
      pageState.sessionId = hashId;
   });

   // Scrolling
   let onscroll = (event: Event) => {
      uiModule.debounce(() => {
         const box = event.currentTarget as HTMLElement;
         const atBottom =
            box.scrollHeight - box.scrollTop - box.clientHeight < 80;
         uiModule.setAutoScroll(atBottom);
      }, 100);
      document
         .querySelectorAll(
            ".ctx-popup, .memory-used-detail, .msg-overflow-menu",
         )
         .forEach((p) => p.remove());
      document.querySelectorAll(".memory-used-pill").forEach((p) => {
         p._openDetail = null;
      });
   };

   let onwheel = (e: WheelEvent) => {
      if (e.deltaY < 0) uiModule.setAutoScroll(false);
   };

   let pageState = $state({ sessionId: "" });
   const chatSessionId = $derived(page.state.sessionId);
   $inspect(chatSessionId);

   // ── Helper: start a fresh chat (deselect current, clear history, show welcome) ──
   function _startFreshChat() {
      try {
         const prevId =
            sessionModule && sessionModule.getCurrentSessionId
               ? sessionModule.getCurrentSessionId()
               : null;
         if (chatModule && chatModule.detachCurrentStream)
            chatModule.detachCurrentStream(prevId);
         else if (chatModule && chatModule.abortCurrentRequest)
            chatModule.abortCurrentRequest();
      } catch (e) {
         console.warn("fresh chat stream detach failed:", e);
      }
      if (sessionModule) sessionModule.setCurrentSessionId(null);
      const box = el("chat-history");
      if (box) box.innerHTML = "";
      if (chatModule && chatModule.showWelcomeScreen) {
         chatModule.showWelcomeScreen();
      }
      // Close document panel if open
      if (documentModule && documentModule.closePanel)
         documentModule.closePanel();
      if (researchPanelModule && researchPanelModule.isOpen())
         researchPanelModule.closePanel();
      // Reset research overflow dot (but don't touch research state — caller manages that)
      const _overflowRes = el("overflow-research-btn");
      if (_overflowRes) _overflowRes.classList.remove("active");
      if (typeof updatePlusDot === "function") updatePlusDot();
      // Reset agent mode to Chat
      const modeToggle = el("agent-mode-toggle") as HTMLInputElement;
      if (modeToggle && modeToggle.checked) {
         modeToggle.checked = false;
         modeToggle.dispatchEvent(new Event("change"));
      }
      // Clear character/persona
      if (presetsModule && presetsModule.deactivateCharacter)
         presetsModule.deactivateCharacter();
   }
   onMount(async () => {
      pageState.sessionId =
         sessionModule && sessionModule.getCurrentSessionId
            ? sessionModule.getCurrentSessionId()
            : null;
      // Message count in the header — recount on any DOM change in
      // #chat-history and write "· N msgs" next to the title. Counts top-
      // level .msg elements (one per user/assistant turn); excludes the
      // welcome screen since it isn't inside chat-history.
      const _metaCountEl = document.getElementById("current-meta-count");
      // const chatHistory = document.getElementById("chat-history");
      if (_metaCountEl && chatHistory) {
         let _countScheduled = false;
         const _updateMsgCount = () => {
            _countScheduled = false;
            const n = chatHistory.querySelectorAll(":scope > .msg").length;
            _metaCountEl.textContent = n
               ? `· ${n} msg${n === 1 ? "" : "s"}`
               : "";
         };
         const _scheduleCount = () => {
            if (_countScheduled) return;
            _countScheduled = true;
            requestAnimationFrame(_updateMsgCount);
         };
         new MutationObserver(_scheduleCount).observe(chatHistory, {
            childList: true,
         });
         _updateMsgCount();
      }

      // Internal #session-id links from AI search results
      chatHistory.addEventListener("click", (e) => {
         const link = e.target.closest("a.chat-link");
         if (!link) return;
         const href = link.getAttribute("href");
         if (href && href.startsWith("#") && sessionModule) {
            e.preventDefault();
            sessionModule.selectSession(href.slice(1));
         }
      });
      // Export: PDF
      const exportPdfBtn = el("export-pdf-btn");
      const exportMenu = document.getElementById("export-dropdown-menu");
      if (exportPdfBtn) {
         exportPdfBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            exportMenu.classList.remove("open");
            const meta = sessionModule
               .getSessions()
               .find((s) => s.id === sessionModule.getCurrentSessionId());
            const sessionName = meta ? meta.name : "Odysseus Chat";
            const originalTitle = document.title;
            document.title = sessionName;
            const chatHistory = document.getElementById("chat-history");
            if (chatHistory) chatHistory.dataset.printTitle = sessionName;
            document
               .querySelectorAll("#chat-history details:not([open])")
               .forEach((d) => {
                  d.setAttribute("open", "");
                  d.dataset.printOpened = "1";
               });
            window.print();
            document.title = originalTitle;
            document
               .querySelectorAll("#chat-history details[data-print-opened]")
               .forEach((d) => {
                  d.removeAttribute("open");
                  d.removeAttribute("data-print-opened");
               });
         });
      }
      document.addEventListener("overflow-state-change", () => updatePlusDot());

      // ── Prevent toolbar buttons from stealing focus (avoids mobile keyboard bounce) ──
      const chatInputBar = document.querySelector(".chat-input-bar");
      // ── Keep textarea focused when interacting with chat bar controls (mobile keyboard fix) ──
      const _msgTextarea = el("message");
      if (chatInputBar && _msgTextarea) {
         let _refocusOnBlur = false;
         function _flagRefocus(e) {
            if (e.target.closest("textarea, input")) return;
            // Don't refocus for attach — file picker needs full focus control
            if (e.target.closest("#overflow-attach-btn")) return;
            // Don't refocus for model picker button — focus should go to picker search input
            if (e.target.closest(".model-picker-btn")) return;
            // Don't refocus when tapping the +/chevron tools button — the user
            // is explicitly trying to dismiss the keyboard and open the tools
            // menu. Without this, the textarea blurs (keyboard down), then this
            // handler re-focuses it (keyboard bounces back up).
            if (e.target.closest("#overflow-plus-btn")) return;
            if (document.activeElement === _msgTextarea) _refocusOnBlur = true;
         }
         chatInputBar.addEventListener("touchstart", _flagRefocus, {
            passive: true,
         });
         // Overflow menu is position:fixed — may not bubble through chatInputBar on mobile
         const _overflowMenu = el("overflow-menu");
         if (_overflowMenu)
            _overflowMenu.addEventListener("touchstart", _flagRefocus, {
               passive: true,
            });
         // Model picker menu too
         const _pickerMenu = document.getElementById("model-picker-menu");
         if (_pickerMenu)
            _pickerMenu.addEventListener("touchstart", _flagRefocus, {
               passive: true,
            });
         // Attach strip (outside chat-input-bar)
         const _attachStrip = el("attach-strip");
         if (_attachStrip)
            _attachStrip.addEventListener("touchstart", _flagRefocus, {
               passive: true,
            });
         _msgTextarea.addEventListener("blur", () => {
            if (_refocusOnBlur) {
               _refocusOnBlur = false;
               setTimeout(() => _msgTextarea.focus(), 0);
            }
         });
         // Clear flag if touch ends without causing blur
         document.addEventListener(
            "touchend",
            () => {
               setTimeout(() => {
                  _refocusOnBlur = false;
               }, 50);
            },
            { passive: true },
         );
      }
      // ── Overflow Group Chat toggle ──
      const overflowGroupBtn = el("overflow-group-btn");
      if (overflowGroupBtn) {
         overflowGroupBtn.addEventListener("click", async () => {
            const chk = el("group-toggle");
            const turningOn = chk ? !chk.checked : false;
            if (turningOn) {
               const picked = await groupModule.showModelPicker();
               if (!picked || picked.length < 2) return;
               groupModule.setActive(true); // Set early so updateModelPicker sees it
               syncGroupIndicator(true);
               _startFreshChat();
               // Clear any leftover splash screens
               const _chatBox = document.getElementById("chat-history");
               if (_chatBox) {
                  _chatBox
                     .querySelectorAll(".tool-splash")
                     .forEach((s) => s.remove());
                  // Also hide welcome screen
                  if (chatModule && chatModule.hideWelcomeScreen)
                     chatModule.hideWelcomeScreen();
               }
               // Start group — create participant sessions immediately
               const sid =
                  sessionModule.getCurrentSessionId() || "group-" + Date.now();
               await groupModule.startGroup(picked, sid);
               // Re-hide picker after everything settles
               const _mpw = el("model-picker-wrap");
               if (_mpw) _mpw.style.display = "none";
               uiModule.showToast(`Group chat ready — ${picked.length} models`);
            } else {
               syncGroupIndicator(false);
               groupModule.stopGroup();
               // Restore model picker
               const _mpWrap2 = el("model-picker-wrap");
               if (_mpWrap2) _mpWrap2.style.display = "";
            }
         });
      }

      // ── Group toggle button (chatbox indicator) — click to deactivate ──
      const groupToggleBtn = el("group-toggle-btn");
      if (groupToggleBtn) {
         groupToggleBtn.addEventListener("click", () => {
            syncGroupIndicator(false);
            groupModule.stopGroup();
         });
      }

      // Observe chat history for new/changed messages — de-emojify on the fly
      let _deEmojifyTimer = null;
      const _chatObs = new MutationObserver(() => {
         if (!document.body.classList.contains("text-emojis")) return;
         clearTimeout(_deEmojifyTimer);
         _deEmojifyTimer = setTimeout(() => {
            document
               .querySelectorAll(".msg .body")
               .forEach((e) => deEmojify(e, _DEOJ_SKIP));
         }, 150);
      });
      const _chatBox = document.getElementById("chat-history");
      if (_chatBox)
         _chatObs.observe(_chatBox, { childList: true, subtree: true });

      // INITIALIZE EVENT LISTENERS
      // Chat form submission
      //  document.getElementById('chat-form').addEventListener('submit', chatModule.handleChatSubmit);

      // File attachments (inside overflow menu)
      const _overflowAttach = document.getElementById("overflow-attach-btn");
      if (_overflowAttach)
         _overflowAttach.addEventListener(
            "click",
            fileHandlerModule.openPicker,
         );
      document.getElementById("file-input").addEventListener("change", (e) => {
         for (const f of e.target.files) fileHandlerModule.addFiles([f]);
         fileHandlerModule.renderAttachStrip();
         // Refocus textarea after file picker closes (mobile keyboard)
         const ta = document.getElementById("message");
         if (ta) setTimeout(() => ta.focus(), 100);
      });
      // Modify form submit to handle special modes
      const chatForm = document.getElementById("chat-form");
      chatForm.onsubmit = handleSubmit;
   });
</script>

<main
   class="chat-container welcome-active"
   id="chat-container"
   aria-label="Chat area"
   aria-busy="false"
>
   <!-- Persistent page heading for assistive tech. Visually hidden so it
      never affects layout, but always present inside the main landmark
      (the sidebar that shows the visible brand is hidden off-canvas on
      mobile) so the page always exposes a single level-1 heading.  -->
   <h1 class="a11y-visually-hidden">Odysseus</h1>

   <div class="chat-top-bar">
      <button
         type="button"
         class="incognito-indicator"
         id="incognito-indicator"
         title="Nobody mode active — click to deactivate"
         style="display:none;"
      >
         <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
         >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <line x1="8" y1="16" x2="16" y2="8" />
            <line x1="8" y1="8" x2="16" y2="16" />
         </svg>
      </button>
      <div class="chat-meta-overlay">
         <span id="current-meta">Odysseus Chat</span>
         <span
            id="current-meta-count"
            class="chat-meta-count"
            aria-hidden="true"
         ></span>
         <span
            id="session-cost-display"
            class="session-cost-display"
            style="display:none;"
         ></span>
         <span class="export-dropdown-wrap" id="export-dropdown-wrap">
            <button
               type="button"
               class="export-dl-btn"
               id="export-dl-btn"
               title="More"
            >
               <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
               >
                  <polyline points="6 9 12 15 18 9" />
               </svg>
            </button>
            <div class="export-dropdown-menu" id="export-dropdown-menu">
               <div class="export-dropdown-item" id="export-rename-btn">
                  <span class="dropdown-icon">
                     <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                     >
                        <path
                           d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
                        />
                     </svg>
                  </span>
                  <span>Rename</span>
               </div>
               <div class="export-dropdown-item" id="export-copy-btn">
                  <span class="dropdown-icon">
                     <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                     >
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path
                           d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        />
                     </svg>
                  </span>
                  <span>Copy Chat</span>
               </div>
               <div class="export-dropdown-item" id="export-pdf-btn">
                  <span class="dropdown-icon">
                     <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                     >
                        <path
                           d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M9 15v-2h2a1.5 1.5 0 0 1 0 3H9z" />
                     </svg>
                  </span>
                  <span>PDF</span>
               </div>
               <div class="export-dropdown-item" id="export-doc-btn">
                  <span class="dropdown-icon">
                     <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                     >
                        <path
                           d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                     </svg>
                  </span>
                  <span>Save to Documents</span>
               </div>
            </div>
         </span>
      </div>
   </div>

   <div
      id="chat-history"
      class="chat-history block"
      role="log"
      aria-live="polite"
      bind:this={chatHistory}
      {onwheel}
      {onscroll}
   ></div>
   <!-- Attachments strip -->
   <div id="attach-strip" class="attach-strip"></div>
   <!-- Hidden elements for form logic -->
   <input type="checkbox" id="research-toggle" style="display:none;" />
   <input type="checkbox" id="rag-toggle" style="display:none;" />
   <input type="checkbox" id="incognito-toggle" style="display:none;" />
   <input type="file" id="file-input" class="hidden" multiple />
   <MessageInput sessionId={chatSessionId ?? pageState.sessionId} />
   <form
      id="chat-form"
      autocomplete="off"
      action="javascript:void(0);"
      style="display:none;"
   >
      <input type="checkbox" id="web-toggle" style="display:none;" />
      <input type="checkbox" id="bash-toggle" style="display:none;" />
   </form>
   <!-- Character (custom preset) modal -->
   <div id="custom-preset-modal" class="modal hidden">
      <div
         class="modal-content preset-modal-content"
         role="dialog"
         aria-label="Prompt"
         style="background:var(--bg)"
      >
         <div class="modal-header">
            <h4>
               <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style="vertical-align:-2px;margin-right:6px"
               >
                  <path d="m18 2 4 4" />
                  <path d="m17 7 3-3" />
                  <path
                     d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"
                  />
                  <path d="m9 11 4 4" />
                  <path d="m5 19-3 3" />
                  <path d="m14 4 6 6" />
               </svg>
               Prompt
            </h4>
            <button
               class="close-btn"
               id="close-custom-preset"
               aria-label="Close prompt">✖</button
            >
         </div>
         <div class="modal-body preset-modal-body">
            <div id="char-fields-wrap">
               <div class="preset-tabs">
                  <button class="preset-tab active" data-chartab="inject">
                     <svg
                        class="preset-tab-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                     >
                        <path d="m18 2 4 4" />
                        <path d="m17 7 3-3" />
                        <path
                           d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"
                        />
                        <path d="m9 11 4 4" />
                        <path d="m5 19-3 3" />
                        <path d="m14 4 6 6" />
                     </svg>
                     <span>Inject</span>
                  </button>
                  <button class="preset-tab" data-chartab="character">
                     <svg
                        class="preset-tab-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                     >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                     </svg>
                     <span>Persona</span>
                  </button>
                  <button class="preset-tab" data-chartab="group">
                     <svg
                        class="preset-tab-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                     >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                     </svg>
                     <span>Group</span>
                  </button>
               </div>
               <!-- Inject tab (also holds model tuning: temperature + max tokens) -->
               <div class="preset-chartab" data-chartab-panel="inject">
                  <label for="inject-prefix">Prefix</label>
                  <textarea
                     id="inject-prefix"
                     rows="2"
                     placeholder="Added before your message"
                     style="margin-bottom:8px"
                  ></textarea>
                  <label for="inject-suffix">Suffix</label>
                  <textarea
                     id="inject-suffix"
                     rows="2"
                     placeholder="Added after your message"
                     style="margin-bottom:12px"
                  ></textarea>
                  <div class="preset-slider-row">
                     <label for="temp-value"
                        >Temperature <span
                           class="preset-hint-icon"
                           title="Controls randomness. Lower values give focused, deterministic answers (good for code). Higher values give more creative, varied responses."
                           >?</span
                        ></label
                     >
                     <span class="preset-slider-value" id="temp-value">1.0</span
                     >
                  </div>
                  <input
                     type="range"
                     class="preset-range"
                     id="custom-temperature"
                     min="0"
                     max="2"
                     step="0.1"
                     value="1.0"
                  />
                  <div class="preset-temp-hints">
                     <span>Precise / Code</span>
                     <span>Balanced</span>
                     <span>Creative</span>
                  </div>
                  <div class="preset-slider-row">
                     <label for="tokens-value"
                        >Max Tokens <span
                           class="preset-hint-icon"
                           title="Maximum length of the AI response. 'No limit' lets the model decide when to stop."
                           >?</span
                        ></label
                     >
                     <span class="preset-slider-value" id="tokens-value"
                        >No limit</span
                     >
                  </div>
                  <input
                     type="range"
                     class="preset-range"
                     id="custom-max-tokens"
                     min="256"
                     max="8448"
                     step="256"
                     value="8448"
                  />
               </div>
               <!-- Prompt (character/persona) tab -->
               <div
                  class="preset-chartab"
                  data-chartab-panel="character"
                  style="display:none"
               >
                  <label for="char-template-select">Persona</label>
                  <div class="char-name-combo">
                     <select
                        id="char-template-select"
                        class="char-template-select"
                     >
                        <option value="">Select persona...</option>
                     </select>
                     <button
                        type="button"
                        id="char-new-btn"
                        class="char-action-btn"
                        title="Create a new persona">+ New</button
                     >
                  </div>
                  <div id="char-name-row">
                     <label for="custom-character-name">Name</label>
                     <div class="char-name-combo">
                        <input
                           type="text"
                           id="custom-character-name"
                           maxlength="50"
                           placeholder="Give your persona a name..."
                           autocomplete="off"
                           style="flex:1"
                        />
                        <button
                           type="button"
                           id="char-delete-template-btn"
                           class="char-action-btn"
                           title="Delete this persona and its memories"
                           style="display:none;margin-top:-6px !important"
                        >
                           <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              style="vertical-align:-2px;margin-right:4px"
                           >
                              <polyline points="3 6 5 6 21 6" />
                              <path
                                 d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                              />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                           </svg>
                           Delete
                        </button>
                        <button
                           type="button"
                           id="reset-character-btn"
                           class="char-action-btn"
                           title="Reset to default"
                           style="margin-top:-6px !important"
                           >&#x21BA; Reset</button
                        >
                     </div>
                  </div>
                  <label for="custom-system-prompt">System prompt</label>
                  <div class="char-prompt-wrap">
                     <textarea
                        id="custom-system-prompt"
                        rows="4"
                        placeholder="Write rough notes and click Expand, or leave empty"
                     ></textarea>
                     <button
                        type="button"
                        id="char-expand-btn"
                        class="char-expand-btn"
                        title="AI expand — turn your notes into a full system prompt"
                     >
                        <svg
                           width="11"
                           height="11"
                           viewBox="0 0 24 24"
                           fill="currentColor"
                           style="vertical-align:-1px;margin-right:2px;"
                        >
                           <path
                              d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z"
                           />
                        </svg>
                        Expand
                     </button>
                  </div>
               </div>
               <!-- Group tab -->
               <div
                  class="preset-chartab"
                  data-chartab-panel="group"
                  style="display:none"
               >
                  <div style="display:flex;gap:4px;margin-bottom:8px;">
                     <button
                        type="button"
                        class="compare-parallel-toggle"
                        id="group-mode-btn"
                        style="flex:1;height:auto;width:auto;"
                     >
                        <svg
                           width="18"
                           height="18"
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke="currentColor"
                           stroke-width="2"
                           stroke-linecap="round"
                        >
                           <line x1="8" y1="6" x2="20" y2="6" />
                           <line x1="8" y1="12" x2="20" y2="12" />
                           <line x1="8" y1="18" x2="20" y2="18" />
                           <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                           <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                           <circle cx="4" cy="18" r="1.5" fill="currentColor" />
                        </svg>
                        <span class="compare-toggle-label">Sequential</span>
                     </button>
                  </div>
                  <div
                     id="group-participants"
                     style="display:flex;flex-direction:column;gap:4px;margin-bottom:0;max-height:220px;overflow-y:auto;"
                  ></div>
                  <button
                     type="button"
                     id="group-add-btn"
                     class="preset-save-btn"
                     style="width:100%;background:none;border:1px dashed var(--border);color:var(--fg);opacity:0.6;font-size:11px;padding:4px;margin-top:0;"
                     >+ Add participant</button
                  >
               </div>
            </div>
         </div>
         <div class="modal-footer">
            <div style="flex:1"></div>
            <button
               type="button"
               id="cancel-custom-preset"
               style="margin-right:8px;display:none;">Cancel</button
            >
            <button type="button" id="save-custom-preset">Start</button>
         </div>
      </div>
   </div>
</main>
<!-- <button id="scroll-bottom-btn" class="scroll-nav-btn" title="Scroll to bottom">▼</button> -->
<!-- Scroll-to-bottom button — logic owned by ScrollChatBottom.svelte.
		     The inline scroll script in web/app.html (lines 288-347) can be
		     removed once this component is confirmed working. -->
<ScrollChatBottom />
<UserMsgScrollMarker chat={chatHistory} />

<!-- Rename Session Modal -->
<style>
   .chat-history {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior-y: none;
      margin-bottom: 8px;
      white-space: normal;
      min-height: 0;
      --chat-max: 800px;
      padding-left: max(0px, calc((100% - var(--chat-max)) / 2));
      padding-right: max(12px, calc((100% - var(--chat-max)) / 2 + 12px));
   }
   :global(.chat-history > *) {
      flex: 0 0 auto;
   }

   .chat-container.welcome-active :global(.chat-input-bar) {
      margin-bottom: 1vh;
   }

   .chat-history::-webkit-scrollbar-thumb {
      border-width: 1px;
      width: 3px;
   }

   :global(.chat-history .msg){
      animation:none !important;
      transition: padding
   }

   @media (width>=480px) {
      .chat-history::-webkit-scrollbar-thumb {
         border-width: 1px;
         border-radius: 5px;
         width: 3px !important;
      }
   }

   @media (width>=768px) {
      .chat-history::-webkit-scrollbar-thumb {
         border-width: 2px;
         border-radius: 24%;
         width: 5px;
      }
   }

   @media (width>=1024px) {
      .chat-history::-webkit-scrollbar-thumb {
         border-width: 0px;
         border-radius: 12%;
         width: 8px;
      }
   }

   @media print {
      main.chat-container {
         width: 100% !important;
         margin: 0 !important;
         padding: 0 !important;
         max-height: none !important;
         overflow: visible !important;
      }
      #chat-history {
         max-height: none !important;
         overflow: visible !important;
         height: auto !important;
         padding: 0 !important;
      }
      #chat-history::before {
         content: attr(data-print-title);
         display: block;
         font-size: 1.3em;
         font-weight: bold;
         margin-bottom: 1em;
         color: #000;
      }
   }
</style>
