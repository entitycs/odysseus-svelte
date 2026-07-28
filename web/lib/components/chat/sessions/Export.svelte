<script lang="ts">
  import documentModule from "$lib/legacy/document";
  import sessionModule from "$lib/legacy/sessions";
  import uiModule from "$lib/legacy/ui";

  let { chatHistory, sessionId } = $props();

  let exportMenu: HTMLDivElement;

  // Serialize the current chat history into a plain-text transcript.
  // Includes user messages, assistant rounds, and agent tool calls in DOM order.
  function _serializeChatTranscript() {
    const box = document.getElementById("chat-history");
    if (!box) return "";
    const parts = [];
    for (const child of box.children) {
      if (child.classList?.contains("msg")) {
        const isUser = child.classList.contains("msg-user");
        let label;
        if (isUser) {
          label = "User";
        } else {
          const roleEl = child.querySelector(".role");
          const ts = roleEl?.querySelector(".role-timestamp");
          let raw = roleEl ? roleEl.textContent : "";
          if (ts) raw = raw.replace(ts.textContent, "");
          label = (raw || "").trim() || "Assistant";
        }
        const body = child.querySelector(".body");
        // Prefer dataset.raw (original markdown) over innerText (rendered HTML as text)
        // to avoid extra newlines and formatting artifacts. Raw text lives on
        // the outer .msg in the main renderer; keep body.dataset.raw as a legacy
        // fallback for older/reused render paths.
        const text = (
          child.dataset?.raw ||
          body?.dataset?.raw ||
          body?.innerText ||
          body?.textContent ||
          ""
        ).trim();
        if (text) parts.push(`${label}: ${text}`);
      } else if (child.classList?.contains("agent-thread")) {
        const lines = ["[Tool calls]"];
        for (const n of child.querySelectorAll(".agent-thread-node")) {
          const tool =
            n.querySelector(".agent-thread-tool")?.textContent?.trim() ||
            "tool";
          const cmd =
            n.querySelector(".agent-thread-cmd")?.textContent?.trim() || "";
          const output =
            n.querySelector(".agent-tool-output pre")?.textContent?.trim() ||
            "";
          const status = n.classList.contains("error") ? "failed" : "done";
          let line = `- ${tool} [${status}]`;
          if (cmd) line += `\n  cmd: ${cmd}`;
          if (output) {
            const truncated =
              output.length > 2000 ? output.slice(0, 2000) + "…" : output;
            line += `\n  out: ${truncated}`;
          }
          lines.push(line);
        }
        parts.push(lines.join("\n"));
      }
    }
    return parts.join("\n\n");
  }

  // Export: Copy all messages
  const exportCopyBtnClicked = async (e) => {
    e.stopPropagation();
    exportMenu.classList.remove("open");
    const transcript = _serializeChatTranscript();
    // A new/empty chat has nothing to copy — don't write an empty string and
    // falsely report "Copied".
    if (!transcript.trim()) {
      uiModule.showToast("Nothing to copy yet");
      return;
    }
    await uiModule.copyToClipboard(transcript);
  };

  // Export menu: Compact current chat context
  const exportCompactBtnClicked = async (e) => {
    e.stopPropagation();
    exportMenu.classList.remove("open");
    if (window.compactCurrentChatContext) {
      await window.compactCurrentChatContext();
    } else {
      uiModule.showError("Compact action is not ready yet");
    }
  };

  // Export: PDF
  const exportPdfBtnClicked = (e) => {
    e.stopPropagation();
    exportMenu.classList.remove("open");
    const meta = sessionModule.getSessions().find((s) => s.id === sessionId);
    const sessionName = meta ? meta.name : "Odysseus Chat";
    const originalTitle = document.title;
    document.title = sessionName;
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
  };

  // Export: Save to Docs
  const exportDocBtnClicked = async (e) => {
    e.stopPropagation();
    exportMenu.classList.remove("open");
    try {
      const sessionId = sessionModule.getCurrentSessionId();
      const texts = _serializeChatTranscript();
      const meta = sessionModule.getSessions().find((s) => s.id === sessionId);
      const title = meta?.name || "Untitled";
      const res = await fetch(`/api/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          title,
          content: texts,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const doc = await res.json();
      if (documentModule) documentModule.loadDocument(doc.id);
      uiModule.showToast("Saved to documents");
    } catch (err) {
      console.error("Save to docs failed:", err);
      uiModule.showError("Failed to save to documents");
    }
  };
  // Export menu: Delete current chat
  const exportDeleteBtnClicked = async (e) => {
    e.stopPropagation();
    exportMenu.classList.remove("open");
    if (sessionModule?.deleteCurrentSessionFromTopMenu) {
      await sessionModule.deleteCurrentSessionFromTopMenu();
    }
  };

  // Rename session from top bar
  const exportRenameBtnClicked = (e) => {
    e.stopPropagation();
    exportMenu.classList.remove("open");
    let sid = sessionModule.getCurrentSessionId();
    // A brand-new chat has no session id yet — still allow renaming if there's
    // a pending chat (we materialize it on commit so the name sticks).
    const hasPending =
      sessionModule.hasPendingChat && sessionModule.hasPendingChat();
    if (!sid && !hasPending) return;
    const meta = sid
      ? sessionModule.getSessions().find((s) => s.id === sid)
      : null;
    const currentName = meta?.name || "";
    const metaEl = document.getElementById("current-meta");
    if (!metaEl) return;

    // Replace title with an input
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.className = "session-rename-input";
    input.style.cssText =
      "font-size:inherit;background:transparent;border:none;border-bottom:1px solid var(--accent, var(--red));color:var(--fg);outline:none;width:100%;padding:0;";
    const origText = metaEl.textContent;
    metaEl.textContent = "";
    metaEl.appendChild(input);
    input.focus();
    input.select();

    const commit = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        // Materialize a pending (new) chat first so it has an id to rename.
        if (!sid && sessionModule.materializePendingSession) {
          try {
            await sessionModule.materializePendingSession();
            sid = sessionModule.getCurrentSessionId();
          } catch (_) {}
        }
        if (!sid) {
          metaEl.textContent = newName;
          return;
        }
        const fd = new FormData();
        fd.append("name", newName);
        await fetch(`/api/session/${sid}`, {
          method: "PATCH",
          body: fd,
        });
        const _m = sessionModule.getSessions().find((s) => s.id === sid);
        if (_m) _m.name = newName;
        metaEl.textContent = newName;
        uiModule.showToast("Renamed");
        sessionModule.loadSessions();
      } else {
        metaEl.textContent = origText;
      }
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      }
      if (ev.key === "Escape") {
        input.removeEventListener("blur", commit);
        metaEl.textContent = origText;
      }
    });
  };
</script>

<span class="export-dropdown-wrap" id="export-dropdown-wrap">
  <button type="button" class="export-dl-btn" id="export-dl-btn" title="More">
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
  <div
    bind:this={exportMenu}
    class="export-dropdown-menu"
    id="export-dropdown-menu"
  >
    <button
      class="export-dropdown-item"
      id="export-rename-btn"
      onclick={exportRenameBtnClicked}
    >
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
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </span>
      <span>Rename</span>
    </button>
    <button
      class="export-dropdown-item"
      id="export-compact-btn"
      onclick={exportCompactBtnClicked}
    >
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
          <path d="M4 7h16" />
          <path d="M7 12h10" />
          <path d="M10 17h4" />
        </svg>
      </span>
      <span class="export-compact-pill">Compact</span>
    </button>
    <button
      class="export-dropdown-item"
      id="export-copy-btn"
      onclick={exportCopyBtnClicked}
    >
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
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </span>
      <span>Copy Chat</span>
    </button>
    <button
      class="export-dropdown-item"
      id="export-pdf-btn"
      onclick={exportPdfBtnClicked}
    >
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
    </button>
    <button
      class="export-dropdown-item"
      id="export-doc-btn"
      onclick={exportDocBtnClicked}
    >
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
    </button>
    <button
      class="export-dropdown-item dropdown-item-danger"
      id="export-delete-btn"
      onclick={exportDeleteBtnClicked}
    >
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
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </span>
      <span>Delete Chat</span>
    </button>
  </div>
</span>

<style>
.export-dropdown-item{
  border: none;
  width: 100%;
}
</style>
