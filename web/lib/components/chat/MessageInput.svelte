<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import ModelPicker from "$lib/components/chat/models/picker/ModelPicker.svelte";
  import Toast from "$lib/components/toast/Toast.svelte";
  import {
    handleEnterKey,
    handleEscapeKey,
  } from "$lib/input/keyboardHandlers.js";
  import {
    handleGhostAutocomplete,
    handleMobileLineBreak,
  } from "$lib/input/mobileHandlers.js";
  import {
    autoResize,
    isMobileChatInput,
  } from "$lib/input/textareaUtils.js";
  import chatModule from "$lib/legacy/chat";
  import fileHandlerModule from "$lib/legacy/fileHandler";
  // import { pushRecent } from "$lib/legacy/modelPicker";
  import { createDirectChat, getPendingChat, getSessions, setPendingChat } from "$lib/legacy/sessions";
  import { modelItems } from "./models/modelItemStore.svelte";
  import QueuedMessageItem from "./QueuedMessageItem.svelte";

  // Props
  interface Props {
    sessionId: string | null;
    onSubmit?: (message: string, files: any[]) => void;
    placeholder?: string;
    disabled?: boolean;
  }

  let {
    sessionId = null,
    onSubmit = () => {},
    placeholder = "Message Odysseus...",
    disabled = false,
  }: Props = $props();

  // Runes

  let message = $state("");
  let ghostText = $state("");
  let isTextareaFocused = $state(false);
  let isQueueActive = $state(false);
  let toastVisible = $state(false);
  let toastMessage = $state("");
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Refs
  let textareaElement: HTMLTextAreaElement;
  let ghostElement: HTMLElement;
  // let modelPickerElement: HTMLElement;
  let messageForm: HTMLFormElement;
  let attachStripElement: HTMLElement;
  let fileInputElement: HTMLInputElement;

  //----------------------------------------------------------------------------
  function generateId() {
    return Math.random().toString(36).substring(2, 9);
  }
  let messageQueue: Array<{ id: string; prompt: string; files: any[] }> =
    $state([]);
  let editingMessageId: string | null = null;

  function onQueueSendNow(id: string) {
    const idx = messageQueue.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const msg = messageQueue[idx];
    messageQueue.splice(idx, 1);
    messageQueue = messageQueue;

    const ta = document.getElementById("message") as HTMLTextAreaElement;
    if (ta) {
      ta.value = msg.prompt;
      if (msg.files && msg.files.length > 0 && fileHandlerModule) {
        fileHandlerModule.clearPending();
        fileHandlerModule.addFiles(msg.files);
        fileHandlerModule.renderAttachStrip();
      }
      if (chatModule && chatModule.handleChatSubmit) {
        // TODO - this will cancel the current submission if called once
        chatModule.handleChatSubmit(new Event("submit"));
      }
    }
  }

  function onQueueEdit(id: string) {
    const idx = messageQueue.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const msg = messageQueue[idx];
    // messageQueue.splice(idx, 1);
    // messageQueue = messageQueue;

    const ta = document.getElementById("message") as HTMLTextAreaElement;
    if (ta) {
      ta.value = msg.prompt;
      if (msg.files && msg.files.length > 0 && fileHandlerModule) {
        fileHandlerModule.clearPending();
        fileHandlerModule.addFiles(msg.files);
        fileHandlerModule.renderAttachStrip();
      }
      ta.focus();
      // Mark this message as being edited
      editingMessageId = id;
    }
  }

  function onQueueDelete(id: string) {
    messageQueue = messageQueue.filter((m) => m.id !== id);
  }

  function handleChatSubmitWithQueue(e: Event) {
    e.preventDefault();

    const sid = sessionId;//sessionModule ? sessionModule.getCurrentSessionId() : null;
    const isStreaming =
      chatModule && chatModule.hasActiveStream
        ? chatModule.hasActiveStream(sid)
        : false;

    if (isStreaming) {
      const ta = document.getElementById("message") as HTMLTextAreaElement;
      const prompt = ta ? ta.value.trim() : "";

      if (
        !prompt &&
        (!fileHandlerModule || fileHandlerModule.getPendingCount() === 0)
      ) {
        console.log("empty message");
        return;
      }

      const files =
        fileHandlerModule &&
        typeof fileHandlerModule.getPendingRaw === "function"
          ? [...fileHandlerModule.getPendingRaw()]
          : [];

      console.log("adding message to queue");

      if (editingMessageId) {
        // Update existing queued message
        const idx = messageQueue.findIndex((m) => m.id === editingMessageId);
        if (idx !== -1) {
          messageQueue[idx].prompt = prompt;
          messageQueue[idx].files = files;
        }
        editingMessageId = null; // clear edit mode
      } else {
        // Normal behavior: push new message
        messageQueue.push({
          id: generateId(),
          prompt,
          files,
        });
      }

      if (ta) ta.value = "";
      if (fileHandlerModule) {
        fileHandlerModule.clearPending();
      }

      console.log("checking streaming status for dequeuing");
      checkQueueDrain();
    } else {
      console.log("not streaming");
      handleSubmit(e);
    }
  }

  let drainInterval: any;
  function checkQueueDrain() {
    if (drainInterval) return;
    drainInterval = setInterval(() => {
      const sid = sessionId;//sessionModule ? sessionModule.getCurrentSessionId() : null;
      const isStreaming =
        chatModule && chatModule.hasActiveStream
          ? chatModule.hasActiveStream(sid)
          : false;

      if (!isStreaming) {
        clearInterval(drainInterval);
        drainInterval = null;

        if (messageQueue.length > 0) {
          const next = messageQueue[0];
          onQueueSendNow(next.id);
          setTimeout(checkQueueDrain, 1000);
        }
      }
    }, 500);
  }

  //----------------------------------------------------------------------------
  // Helpers
  function show(message: string, duration: number = 2000) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage = message;
    toastVisible = true;
    toastTimer = setTimeout(() => {
      toastVisible = false;
      toastMessage = "";
    }, duration);
  }

  function submitMessage() {
    if (
      !message.trim() &&
      (!fileInputElement?.files?.length || fileInputElement.files.length === 0)
    ) {
      show("Please enter a message");
      return;
    }

    const files: any[] = [];
    if (fileInputElement && fileInputElement.files?.length > 0) {
      for (const file of fileInputElement.files) {
        files.push(file);
      }
    }

    onSubmit(message.trim(), files);

    // Reset message
    message = "";
    if (fileInputElement) {
      fileInputElement.value = "";
    }
    if (attachStripElement) {
      attachStripElement.innerHTML = "";
    }
  }

  function handleTextareaInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    message = target.value;
    let previousValue = ghostText;
    // Auto-resize
    autoResize(target);

    // Update ghost text
    ghostText = target.value;

    // Mobile line break handling
    if (handleMobileLineBreak(e as InputEvent, previousValue)) {
      return;
    }
  }

  function handleTextareaBeforeInput(e: InputEvent) {
    // Mobile line break detection
    if (handleMobileLineBreak(e, message)) {
      return;
    }
  }

  function handleTextareaKeyDown(e: KeyboardEvent) {
    const ta = textareaElement;
    if (!ta) return;

    // Ghost autocomplete
    if (handleGhostAutocomplete(e)) {
      return;
    }

    // Enter key handling
    if (handleEnterKey(e, message)) {
      return;
    }

    // Escape key
    // if (handleEscapeKey(e)) {
    //   return;
    // }
  }

  function handleTextareaPaste(e: ClipboardEvent) {
    // Auto-resize after paste
    setTimeout(() => {
      if (textareaElement) {
        autoResize(textareaElement);
      }
    }, 1);
  }



  function handleModelSelected(model: any) {
    if (onModelChange) {
      onModelChange(model);
    }
    show(`Using ${model.display}`);
  }

  // async function handleModelPicked(model: any) {
  //   console.log("made it 3");
  //   console.log(model);

  //   const currentSessionId = sessionId;//_deps.getCurrentSessionId();
  //   const _pendingChat = getPendingChat();

  //   // Remember this pick so it surfaces under "Recent" next time the picker
  //   // opens — the whole point of quick-switch.
  //   if (model && model.mid) pushRecent(model.mid);

  //   // Broadcast immediately so listeners (e.g. the tour) can advance without
  //   // waiting for the async session-create/PATCH that follows.
  //   try {
  //     document.dispatchEvent(
  //       new CustomEvent('odysseus:model-picked', { detail: model }),
  //     );
  //   } catch {}

  //   // Blur search input before closing to dismiss keyboard on mobile
  //   if (document.activeElement) document.activeElement.blur();
  //   // isModelPickerOpen = false;// _close();
  //   // Refocus main textarea — skip on mobile to avoid keyboard bounce
  //   if (window.innerWidth >= 768) {
  //     const _ta = document.getElementById('message');
  //     if (_ta) setTimeout(() => _ta.focus(), 50);
  //   }
  //   if (!currentSessionId && _pendingChat) {
  //     // Already have a deferred session — just update the model
  //     setPendingChat({
  //       url: model.url,
  //       modelId: model.mid,
  //       endpointId: model.endpointId,
  //       source: 'manual',
  //     });
  //     // Header stays as session name — model switch only updates picker
  //     // updateModelPicker();
  //     return;
  //   } else if (!currentSessionId) {
  //     // No session yet — create one with this model
  //     await createDirectChat(model.url, model.mid, model.endpointId);
  //   } else {
  //     // Existing session with no model — PATCH it
  //     const fd = new FormData();
  //     fd.append('model', model.mid);
  //     fd.append('endpoint_url', model.url);
  //     if (model.endpointId) fd.append('endpoint_id', model.endpointId);
  //     try {
  //       const res = await fetch(`/api/session/${currentSessionId}`, {
  //         method: 'PATCH',
  //         body: fd,
  //       });
  //       if (!res.ok) {
  //         // uiModule.showError('Failed to set model');
  //         return;
  //       }
  //       const sessions = getSessions();
  //       const s = sessions.find((x) => x.id === currentSessionId);
  //       if (s) {
  //         s.model = model.mid;
  //         s.endpoint_url = model.url;
  //       }
  //       // Header stays as session name — model info shown in picker only
  //     } catch (e) {
  //       // uiModule.showError('Failed to set model: ' + e);
  //       return;
  //     }
  //   }

  //   show(`Using ${model.display}`);
  //   // currentModelId = model.mid
  //   // isModelPickerOpen = false;
  // }

  function handleAttachFiles() {
    if (fileInputElement) {
      fileInputElement.click();
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length > 0 && attachStripElement) {
      // Render attach strip
      attachStripElement.innerHTML = "";
      for (const file of input.files) {
        const fileDiv = document.createElement("div");
        fileDiv.className = "attached-file";
        fileDiv.textContent = file.name;
        attachStripElement.appendChild(fileDiv);
      }
      // Focus textarea
      setTimeout(() => textareaElement.focus(), 100);
    }
  }

  // Sync ghost text with textarea
  function syncGhostText(textarea: HTMLTextAreaElement) {
    ghostElement.textContent = textarea.value;
  }

  // Form submission
  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!isQueueActive) {
      submitMessage();
    }
  }

  // Mobile touch handlers
  function handleTouchStart(e: TouchEvent) {
    if (e.target.closest("button, input, textarea, select, label")) {
      return;
    }
    if (document.activeElement === textareaElement) {
      // We're in the input area, don't interfere
      return;
    }
    // Don't refocus if clicking attach button
    if (e.target.closest(".overflow-plus-btn")) {
      return;
    }
    // Don't refocus if clicking model picker button
    if (e.target.closest(".model-picker-btn")) {
      return;
    }
  }

  function handleTouchEnd() {
    // Handle the refocus logic on mobile
    if (isMobileChatInput()) {
      if (document.activeElement === textareaElement) {
        textareaElement.focus();
      }
    }
  }

  // Form reference
  $effect(() => {
    if (!messageForm) return;

    messageForm.addEventListener("submit", handleSubmit);

    return () => {
      messageForm.removeEventListener("submit", handleSubmit);
    };
  });

  // Keyboard navigation for model picker
  // $effect(() => {
  //   if (isModelPickerOpen) {
  //     const searchInput = el("model-picker-search") as HTMLInputElement;
  //     if (searchInput) {
  //       searchInput.focus();
  //     }
  //   }
  // });

  // Mobile keyboard refocus
  $effect(() => {
    if (isTextareaFocused) {
      textareaElement?.focus();
    }
  });
  let unsubscribeModelItems;
  let _modelList;
  // let sessionId: string = $state('');
  let modelPicker;
  onMount(() => {

      // refreshModels();
      unsubscribeModelItems = modelItems.subscribe(async (value) => {

         _modelList = value;
       });

    // Sync ghost text on mount
    syncGhostText(textareaElement);

    // Mobile enter key hint
    if (isMobileChatInput()) {
      const ta = textareaElement;
      if (ta) {
        ta.setAttribute("aria-label", "Message input (newline sends message)");
        ta.setAttribute("placeholder", "Message Odysseus... (newline sends)");
      }
    }

    // // Global keyboard handlers
    // document.addEventListener("keydown", handleGlobalKeyDown);

    // // Close picker on click outside
    // document.addEventListener("click", (e) => {
    //   if (isModelPickerOpen) {
    //     const menu = modelPickerElement;
    //     const btn = el("model-picker-btn");
    //     if (menu && !menu.contains(e.target) && e.target !== btn) {
    //       isModelPickerOpen = false;
    //     }
    //   }
    // });

    // return () => {
    //   document.removeEventListener("keydown", handleGlobalKeyDown);
    // };
  });



  // Expose submit function
  let submit = $derived.by(() => submitMessage);

  // Expose message state
  let clearMessage = $derived.by(() => {
    message = "";
    if (textareaElement) {
      textareaElement.focus();
    }
  });

  let focusMessage = $derived.by(() => {
    textareaElement.focus();
  });

</script>

<div class="chat-input-bar">
  {#if messageQueue.length > 0}
    <div
      class="message-queue-panel"
      style="max-height: 25vh; overflow-y: auto; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; margin: 0 8px 8px 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
    >
      {#each messageQueue as queuedMessage (queuedMessage.id)}
        <QueuedMessageItem
          id={queuedMessage.id}
          content={queuedMessage.prompt}
          files={queuedMessage.files}
          onSendNow={onQueueSendNow}
          onEdit={onQueueEdit}
          onDelete={onQueueDelete}
        />
      {/each}
    </div>
  {/if}
  <div class="chat-input-top">
    <div class="ghost-text-overlay" bind:this={ghostElement}>
      {ghostText}
    </div>

    <textarea
      bind:this={textareaElement}
      bind:value={message}
      id="message"
      class="message"
      {placeholder}
      {disabled}
      rows="1"
      aria-label="Message input"
      use:autoResize
      oninput={handleTextareaInput}
      onbeforeinput={handleTextareaBeforeInput}
      onsubmit={handleChatSubmitWithQueue}
      onkeydown={handleTextareaKeyDown}
      onpaste={handleTextareaPaste}
      onfocus={() => (isTextareaFocused = true)}
      onblur={() => (isTextareaFocused = false)}
    ></textarea>

    <!-- Model picker -->

    <ModelPicker
      bind:this={modelPicker}
      {sessionId}
      // bind:isOpen={isModelPickerOpen}
      // bind:selectedModelId={currentModelId}
      placeholder="Select Model..."
    />
  </div>

  <div class="chat-input-bottom" style="visibility:hidden">
    <div class="chat-input-left">
      <!-- Overflow menu (+) — always first/left -->
      <div class="overflow-wrapper">
        <button
          type="button"
          class="input-icon-btn overflow-plus-btn"
          id="overflow-plus-btn"
          title="More tools"
          aria-label="More tools"
          aria-haspopup="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 15 12 9 18 15" />
          </svg>
          <span class="plus-active-dot"></span>
        </button>
        <div id="overflow-menu" class="overflow-menu hidden">
          <button
            type="button"
            class="overflow-menu-item"
            id="overflow-attach-btn"
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
              ><path
                d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
              /></svg
            >
            <span>Attach files</span>
          </button>
          <button
            type="button"
            class="overflow-menu-item"
            id="overflow-doc-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              /><polyline points="14 2 14 8 20 8" /><line
                x1="16"
                y1="13"
                x2="8"
                y2="13"
              /><line x1="16" y1="17" x2="8" y2="17" /><polyline
                points="10 9 9 9 8 9"
              />
            </svg>
            <span>Documents</span>
          </button>
          <button
            type="button"
            class="overflow-menu-item"
            id="overflow-rag-btn"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" /><path
                d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"
              /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>RAG</span>
            <span class="overflow-active-dot"></span>
          </button>
          <button
            type="button"
            class="overflow-menu-item"
            id="overflow-workspace-btn"
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
              <path
                d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
              />
            </svg>
            <span>Workspace</span>
            <span class="overflow-active-dot"></span>
          </button>
          <!-- Inline "deep research mode" toggle removed (superseded by the
                Deep Research sidebar / trigger_research). The hidden
                #research-toggle checkbox is kept inert so existing JS refs
                don't break; without this entry point it can't be enabled. -->
          <!-- Group Chat moved to Characters modal Group tab -->
          <!-- TTS Mode hidden — read-aloud feature is off in this build. -->
          <button
            type="button"
            class="overflow-menu-item"
            id="overflow-tts-btn"
            hidden
            style="display:none"
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
              ><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path
                d="M19.07 4.93a10 10 0 0 1 0 14.14"
              /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg
            >
            <span>TTS Mode</span>
            <span class="overflow-active-dot"></span>
          </button>
          <button
            type="button"
            class="overflow-menu-item"
            id="overflow-preset-btn"
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
              <path d="m18 2 4 4" /><path d="m17 7 3-3" /><path
                d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"
              /><path d="m9 11 4 4" /><path d="m5 19-3 3" /><path
                d="m14 4 6 6"
              />
            </svg>
            <span>Prompt</span>
          </button>
        </div>
      </div>
      <!-- Web search (magnifying glass) -->
      <button
        type="button"
        class="input-icon-btn"
        title="Web search"
        id="web-toggle-btn"
        data-mode-tool="true"
        aria-label="Web search"
        aria-pressed="false"
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
          <circle cx="11" cy="11" r="8" /><line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          />
        </svg>
      </button>
      <!-- Shell commands (terminal) -->
      <button
        type="button"
        class="input-icon-btn"
        title="Shell Access"
        id="bash-toggle-btn"
        data-mode-tool="true"
        aria-label="Shell access"
        aria-pressed="false"
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
          <polyline points="4 17 10 11 4 5" /><line
            x1="12"
            y1="19"
            x2="20"
            y2="19"
          />
        </svg>
      </button>
      <!-- Workspace indicator (hidden until a folder is set) -->
      <button
        type="button"
        class="input-icon-btn tool-indicator"
        title="Workspace - click to clear"
        id="workspace-indicator-btn"
        aria-label="Clear workspace"
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
          ><path
            d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          /></svg
        >
        <span
          style="font-size:11px;margin-left:2px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          id="workspace-indicator-name"
        ></span>
        <svg
          class="tool-indicator-x"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          ><line x1="6" y1="6" x2="18" y2="18" /><line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          /></svg
        >
      </button>
      <!-- RAG toolbar indicator (hidden until active) -->
      <button
        type="button"
        class="input-icon-btn tool-indicator"
        title="RAG active — click to deactivate"
        id="rag-indicator-btn"
        style="display:none;"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" /><path
            d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"
          /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
        <span style="font-size:11px;margin-left:2px;">RAG</span>
        <svg
          class="tool-indicator-x"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          ><line x1="6" y1="6" x2="18" y2="18" /><line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          /></svg
        >
      </button>
      <!-- 6. Deep Research (hidden until active) -->
      <button
        type="button"
        class="input-icon-btn tool-indicator"
        title="Deep Research active — click to deactivate"
        id="research-toggle-btn"
        style="display:none;"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><line
            x1="11"
            y1="8"
            x2="11"
            y2="14"
          /><line x1="8" y1="11" x2="14" y2="11" /></svg
        >
        <span style="font-size:11px;margin-left:2px;">Research</span>
        <svg
          class="tool-indicator-x"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          ><line x1="6" y1="6" x2="18" y2="18" /><line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          /></svg
        >
      </button>
      <!-- 7. Group Chat (hidden until active) -->
      <button
        type="button"
        class="input-icon-btn tool-indicator"
        title="Group Chat active — click to deactivate"
        id="group-toggle-btn"
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
          ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
            cx="9"
            cy="7"
            r="4"
          /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path
            d="M16 3.13a4 4 0 0 1 0 7.75"
          /></svg
        >
        <span style="font-size:11px;margin-left:2px;">Group</span>
        <svg
          class="tool-indicator-x"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          ><line x1="6" y1="6" x2="18" y2="18" /><line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          /></svg
        >
      </button>
      <input type="checkbox" id="group-toggle" style="display:none;" />
      <!-- Character indicator (hidden until active) -->
      <button
        type="button"
        class="input-icon-btn tool-indicator"
        title="Persona active — click to deactivate"
        id="character-indicator-btn"
        style="display:none;"
      >
        <svg
          id="char-indicator-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
            cx="12"
            cy="7"
            r="4"
          /></svg
        >
        <span
          id="character-indicator-name"
          style="font-size:11px;margin-left:2px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        ></span>
        <svg
          class="tool-indicator-x"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          ><line x1="6" y1="6" x2="18" y2="18" /><line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          /></svg
        >
      </button>
      <!-- Compare toolbar indicator (hidden until active) -->
      <button
        type="button"
        class="input-icon-btn tool-indicator"
        title="Compare active — click to deactivate"
        id="compare-indicator-btn"
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
          ><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path
            d="M13 6h3a2 2 0 0 1 2 2v7"
          /><path d="M11 18H8a2 2 0 0 1-2-2V9" /></svg
        >
        <span style="font-size:11px;margin-left:2px;">Compare</span>
        <svg
          class="tool-indicator-x"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          ><line x1="6" y1="6" x2="18" y2="18" /><line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          /></svg
        >
      </button>
    </div>
    <div class="chat-input-right">
      <!-- Agent / Chat mode toggle -->
      <div class="mode-toggle">
        <button
          type="button"
          class="mode-toggle-btn active"
          id="mode-agent-btn"
          aria-pressed="true">Agent</button
        >
        <button
          type="button"
          class="mode-toggle-btn"
          id="mode-chat-btn"
          aria-pressed="false">Chat</button
        >
      </div>
      <button
        type="submit"
        form="chat-form"
        class="send-btn newchat-mode"
        data-mode="newchat"
        aria-label="New chat"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          ><line x1="12" y1="5" x2="12" y2="19" /><line
            x1="5"
            y1="12"
            x2="19"
            y2="12"
          /></svg
        ><span class="send-btn-label">+ New</span>
      </button>
    </div>
  </div>
</div>
<form id="chat-form" class="hidden" bind:this={messageForm}>
  <input type="hidden" name="message" value={message} />
</form>

<!-- Hidden file input -->
<input
  type="file"
  id="file-input"
  class="hidden"
  multiple
  bind:this={fileInputElement}
  onchange={handleFileChange}
/>

<!-- Attachments strip -->
<div
  id="attach-strip"
  class="attach-strip"
  bind:this={attachStripElement}
></div>

<!-- Hidden elements for state -->
<input type="checkbox" id="research-toggle" class="hidden" />
<input type="checkbox" id="rag-toggle" class="hidden" />
<input type="checkbox" id="incognito-toggle" class="hidden" />

<!-- Toast notification -->
{#if toastVisible}
  <div in:fly={{ y: 200, duration: 2000 }} out:fade class="svelte-toast">
    {toastMessage}
  </div>
{/if}

<style>
  .svelte-toast {
    position: fixed;
    top: 113px;
    right: 27rem;
    left: auto;
    bottom: auto;
    background: var(--panel);
    color: var(--fg);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-left: 3px solid var(--accent);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    opacity: 100%;
    transform: translateX(120%);
    transition:
      opacity 1.35s cubic-bezier(0.22, 1, 0.36, 1),
      transform 1.45s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 9999;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(12px);
    max-width: min(360px, calc(100vw - 32px));
    min-width: min(220px, calc(100vw - 32px));
    min-height: 34px;
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    z-index: 9999999999999999999999;
    display: block;
    width: 20rem;
    height: 3rem;
  }
</style>
