<script lang="ts">
  import { toast } from '$lib/components/toast/store';

  let visible = $state(false);

$effect(( ) => {
    let timeout: ReturnType<typeof setTimeout>;

    if ($toast) {
        visible = true;
        timeout = setTimeout(() => visible = false, $toast.duration);
    }

    return () => clearTimeout(timeout);
});
</script>

{#if $toast && visible}
  <div class="toast">{ $toast.message }</div>
{/if}
