<script module lang="ts">
    let favoriteGroup: ModelItem[];
    let startOfGroup = $state(false);
</script>

<script lang="ts">
    import { onMount } from "svelte";
    import ModelSection from "./ModelSection.svelte";
    import type { ModelItem } from "../modelItemStore.svelte";
    import { HorizontalPan } from "$lib/classes/HorizontalPan";
    interface Props {
        model: any;
        favorites: string[];
        onPick?: (m: ModelItem) => void;
        onToggleFavorite?: (mid: string) => boolean;
    }

    let {
        model,
        favorites,
        onPick = () => {
            console.log("made it");
        },
        onToggleFavorite = () => false,
    }: Props = $props();

    $inspect(model);

    const epDisplay = $derived(
        model.epName &&
            !model.display
                .toLowerCase()
                .includes(model.epName.toLowerCase().split("/").pop())
            ? model.epName
            : "",
    );

    let modelName : HTMLElement;
    let modelNameText : HTMLElement;
    let horizontalPan : HorizontalPan;

    let endpointName: HTMLElement;
    let endpointNameText: HTMLElement;
    let horizontalPan2 : HorizontalPan;

    onMount(() => {
        horizontalPan = new HorizontalPan(modelName, modelNameText, {
            speed: 0.75,
            mode: "bounce",
        });
        horizontalPan2 = new HorizontalPan(endpointName, endpointNameText, {
            speed: 0.75,
            mode: "bounce",
        });
        if (favorites.includes(model.mid)) {
            if (!favoriteGroup) {
                favoriteGroup = [model];
                startOfGroup = true;
            } else {
                startOfGroup = false;
                favoriteGroup.push(model);
            }
        }
    });
</script>

<div

    role="button"
    tabindex="0"
    class="model-switch-item"
    class:model-switch-stale={model.stale}
    onclick={() => onPick(model)}
    onkeydown={() => onPick(model)}
>
    <span bind:this={modelName}
    onmouseenter={() => horizontalPan.start()}
    onmouseleave={() => horizontalPan.stop()}
    ontouchstart={() => horizontalPan.start()}
    ontouchend={() => horizontalPan.stop()}
    onfocus={() => horizontalPan.start()}
    onblur={() => horizontalPan.stop()}
    style="overflow:hidden; white-space:nowrap;"
    class="mp-model-name"
    role="contentinfo"><span bind:this={modelNameText} style="display:inline-block;">{model.display}</span></span>

    <span bind:this={endpointName}
    onmouseenter={() => horizontalPan2.start()}
    onmouseleave={() => horizontalPan2.stop()}
    ontouchstart={() => horizontalPan2.start()}
    ontouchend={() => horizontalPan2.stop()}
    onfocus={() => horizontalPan2.start()}
    onblur={() => horizontalPan2.stop()}
    style="overflow:hidden; white-space:nowrap;"
    class="model-switch-ep"
    role="contentinfo"><span bind:this={endpointNameText} style="display:inline-block">{epDisplay}</span></span>

    <button
        class="mp-fav-dot"
        class:active={favorites.includes(model.mid)}
        onclick={(event) => {
            event.stopPropagation();
            onToggleFavorite(model.mid);
        }}
    >
        ●
    </button>
</div>
<hr style="border-top-style: inset;" />

<style>
</style>
