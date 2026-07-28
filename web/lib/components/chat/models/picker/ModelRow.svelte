<script module lang="ts">
    let favoriteGroup : ModelItem[];
    let startOfGroup = $state(false);
</script>

<script lang="ts">
    import { onMount } from "svelte";
    import ModelSection from "./ModelSection.svelte";
    import type { ModelItem } from "../modelItemStore.svelte";

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

    onMount(() =>{
        if (favorites.includes(model.mid)){
            if (!favoriteGroup){
                favoriteGroup = [model];
                startOfGroup = true;
            }
            else{
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
    <span class="mp-model-name">{model.display}</span>
    <span class="model-switch-ep">{epDisplay}</span>

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
