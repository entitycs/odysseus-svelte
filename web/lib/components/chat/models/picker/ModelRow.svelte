<script lang="ts">
    import { onMount } from "svelte";
    import { HorizontalPan } from "$lib/classes/HorizontalPan";
    import type { ModelItem } from "../modelItemStore.svelte";

    interface Props {
        model: any;
        isFavorite: boolean;
        onPick?: (m: ModelItem) => void;
        onToggleFavorite?: (mid: string) => boolean;
    }

    let {
        model,
        isFavorite = false,
        onPick = () => { },
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

    let modelName: HTMLElement;
    let modelNameText: HTMLElement;
    let horizontalPan: HorizontalPan;

    let endpointName: HTMLElement;
    let endpointNameText: HTMLElement;
    let horizontalPan2: HorizontalPan;

    const onmouseenter=() => horizontalPan.start();
    const onmouseleave=() => horizontalPan.stop()
    const ontouchstart=() => horizontalPan.start()
    const ontouchend=() => horizontalPan.stop()
    const onfocus=() => horizontalPan.start()
    const onblur=() => horizontalPan.stop()

    onMount(() => {
        horizontalPan = new HorizontalPan(modelName, modelNameText, {
            speed: 0.75,
            mode: "bounce",
        });
        horizontalPan2 = new HorizontalPan(endpointName, endpointNameText, {
            speed: 0.75,
            mode: "bounce",
        });
    });
</script>

<div
    role="button"
    tabindex="0"
    class="model-switch-item"
    class:model-switch-stale={model.stale}
    onclick={() => onPick(model)}
    onkeydown={(e) => {
        if (e.key == "Enter") onPick(model);
    }}
>
    <span
        bind:this={modelName}
        {onmouseenter}
        {onmouseleave}
        {ontouchstart}
        {ontouchend}
        {onfocus}
        {onblur}
        style="overflow:hidden; white-space:nowrap;"
        class="mp-model-name"
        role="contentinfo"
        ><span bind:this={modelNameText} style="display:inline-block;"
            >{model.display}</span
        ></span
    >

    <span
        bind:this={endpointName}
        onmouseenter={() => horizontalPan2.start()}
        onmouseleave={() => horizontalPan2.stop()}
        ontouchstart={() => horizontalPan2.start()}
        ontouchend={() => horizontalPan2.stop()}
        onfocus={() => horizontalPan2.start()}
        onblur={() => horizontalPan2.stop()}
        style="overflow:hidden; white-space:nowrap;"
        class="model-switch-ep"
        role="contentinfo"
        ><span bind:this={endpointNameText} style="display:inline-block"
            >{epDisplay}</span
        ></span
    >

    <button
        class="mp-fav-dot"
        class:active={isFavorite}
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
    .mp-fav-dot:focus-visible {
        border: 1px dashed;
    }
</style>
