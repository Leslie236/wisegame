<script setup lang="ts">
import { useRoute } from 'vue-router'

import type { Theme, ThemeOption } from '@/composables/useTheme'

defineProps<{
  themes: ThemeOption[]
  theme: Theme
}>()

const emit = defineEmits<{
  'update:theme': [theme: Theme]
}>()

const route = useRoute()
</script>

<template>
  <header class="header">
    <RouterLink class="brand" to="/" aria-label="WISE 牌室首页"
      ><span class="brand-icon">♠</span> WISE<span class="brand-caption">牌室</span></RouterLink
    >
    <div class="header-right">
      <nav class="game-nav" aria-label="选择游戏">
        <RouterLink
          to="/"
          class="game-tab"
          :class="{ active: route.name === 'blackjack' }"
          :aria-current="route.name === 'blackjack' ? 'page' : undefined"
          >21 点</RouterLink
        >
        <RouterLink
          to="/poker"
          class="game-tab"
          :class="{ active: route.name === 'poker' }"
          :aria-current="route.name === 'poker' ? 'page' : undefined"
          >德州扑克</RouterLink
        >
      </nav>
      <div class="themes" role="group" aria-label="切换主题">
        <button
          v-for="option in themes"
          :key="option.id"
          :aria-label="option.name"
          :title="option.name"
          :aria-pressed="theme === option.id"
          :class="{ selected: theme === option.id }"
          @click="emit('update:theme', option.id)"
        >
          <span :style="{ background: option.color }"></span>
        </button>
      </div>
    </div>
  </header>
</template>
