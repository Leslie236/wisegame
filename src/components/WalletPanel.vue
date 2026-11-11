<script setup lang="ts">
defineProps<{
  balance: number
  locked: boolean
}>()

const emit = defineEmits<{ reset: [] }>()
</script>

<template>
  <section class="wallet panel">
    <div class="section-label">我的筹码 <span>◈</span></div>
    <div class="balance">{{ balance.toLocaleString() }}<span>CHIPS</span></div>
    <div class="wallet-bottom">
      <span>初始筹码 1,000</span
      ><button :disabled="locked" @click="emit('reset')">重置筹码 ↻</button>
    </div>
  </section>
</template>
