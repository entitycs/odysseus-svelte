<script lang="ts">
const {
  id,
  content,
  files = [],
  onSendNow,
  onEdit,
  onDelete,
} = $props<{
  id: string;
  content: string;
  files?: any[];
  onSendNow: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}>();
// Odysseus uses plain string tooltips or native title attributes.
// For simplicity, we'll use title attributes here.
</script>


<div class="queued-msg-item flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800/50 last:border-0" style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid var(--border); transition: background-color 0.2s;">
	<!-- Arrow forward icon -->
	<div class="shrink-0 text-gray-500" style="flex-shrink: 0; color: var(--fg-muted);">
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="9 18 15 12 9 6"/>
		</svg>
	</div>

	<!-- Message content -->
	<div class="flex-1 min-w-0 flex items-center gap-2" style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; overflow: hidden;">
		{#if files.length > 0}
			<div class="flex items-center gap-1 shrink-0" style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
				{#each files as file}
					{#if file.type === 'image' || (file?.content_type ?? '').startsWith('image/')}
						<img src={file.url} alt="" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border);" />
					{:else}
						<div class="file-pill" style="display: flex; align-items: center; padding: 2px 6px; border-radius: 4px; background: var(--bg-hover); font-size: 11px; color: var(--fg-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;">
							{file.name ?? 'file'}
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		{#if content}
			<p class="truncate" style="font-size: 13px; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;">{content}</p>
		{:else if files.length === 0}
			<p class="truncate italic" style="font-size: 13px; color: var(--fg-muted); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;">
				Empty message
			</p>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex items-center gap-1 shrink-0" style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
		<!-- Send immediately -->
		<button
			type="button"
			class="q-action-btn"
			title="Send now"
			onclick={() => onSendNow(id)}
			aria-label="Send now"
			style="background: transparent; border: none; padding: 4px; border-radius: 4px; color: var(--fg-muted); cursor: pointer;"
		>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 14px; height: 14px;">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
			</svg>
		</button>

		<!-- Edit -->
		<button
			type="button"
			class="q-action-btn"
			title="Edit"
			onclick={() => onEdit(id)}
			aria-label="Edit"
			style="background: transparent; border: none; padding: 4px; border-radius: 4px; color: var(--fg-muted); cursor: pointer;"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 20h9"/>
				<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
			</svg>
		</button>

		<!-- Delete -->
		<button
			type="button"
			class="q-action-btn"
			title="Delete"
			onclick={() => onDelete(id)}
			aria-label="Delete"
			style="background: transparent; border: none; padding: 4px; border-radius: 4px; color: var(--fg-muted); cursor: pointer;"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="3 6 5 6 21 6"/>
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
			</svg>
		</button>
	</div>
</div>

<style>
	.q-action-btn:hover {
		background-color: var(--bg-hover) !important;
		color: var(--fg) !important;
	}
	.queued-msg-item:hover {
		background-color: rgba(0, 0, 0, 0.02);
	}
	:global(.dark) .queued-msg-item:hover {
		background-color: rgba(255, 255, 255, 0.03);
	}
</style>
