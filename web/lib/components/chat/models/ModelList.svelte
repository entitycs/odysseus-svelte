<script lang="ts">
    import { onMount } from "svelte";
    import { isLoading,  type ModelItem, modelItems, refreshModels} from "./modelItemStore.svelte";
    import helper from "./picker/helpers.svelte";

    interface ModelPickerProps {
        onSelectModel?: (mid: string) => void;
        onAddChat?: () => void;
    }

    let onSelectModel: ModelPickerProps["onSelectModel"];
    let onAddChat: ModelPickerProps["onAddChat"];

    let models: HTMLElement;
    let _modelItems : any[] = $state([]);

    let _unsubscribe;

    onMount(() => {
        _unsubscribe = modelItems.subscribe(
        (value) => {
            _modelItems = helper.getAllModels();
            // refreshModels(false);
        });
        // Load on mount
        // refreshModels(false);
        models.style.display = "block";
    });
</script>

<div id="models" bind:this={models}>
    {#if $isLoading}
        <div class="loading-spinner">Loading…</div>
    {:else}
        <div class="models-row">
            <select
                id="model-select"
                aria-label="Select model"
                style="flex: 1; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--fg);"
                onchange={(e) => onSelectModel?.(e.target.value)}
            >
                {#each _modelItems as m}
                    <option value={m.mid}>{m.display}</option>
                {/each}
            </select>

            <button
                type="button"
                id="btn-model-chat"
                class="model-chat-btn"
                aria-label="Add model chat"
                style="transition: all 0.2s ease;"
                onclick={() => onAddChat?.()}
            >
                <span class="model-chat-btn-label">+ Chat</span>
            </button>
        </div>
    {/if}
</div>

<style>
    #models {
        display: none;
    }
</style>
