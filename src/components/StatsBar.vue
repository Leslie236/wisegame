<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  rounds: number
  wins: number
}>()

const winRate = computed(() => (props.rounds ? Math.round((props.wins / props.rounds) * 100) : 0))
</script>

<template>
  <section class="stats">
    <div>
      <strong>{{ rounds }}</strong
      ><span>已玩局数</span>
    </div>
    <div>
      <strong>{{ wins }}</strong
      ><span>获胜局数</span>
    </div>
    <div>
      <strong>{{ winRate }}<small>%</small></strong
      ><span>本次胜率</span>
    </div>
  </section>
</template>
