<script lang="ts">
  // Re-keys on every change so the new text's letters fade in one after another.
  let { text }: { text: string } = $props();
</script>

{#key text}
  <span aria-label={text}>
    {#each [...text] as c, i}
      <span class="l" aria-hidden="true" style="animation-delay: {i * 28}ms">{c === ' ' ? ' ' : c}</span>
    {/each}
  </span>
{/key}

<style>
  .l {
    display: inline-block;
    animation: letter var(--dur-slow) var(--ease-out) backwards;
  }
  @keyframes letter {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
