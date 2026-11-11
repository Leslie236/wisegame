<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppNav from '@/components/AppNav.vue'
import { useTheme } from '@/composables/useTheme'

const { theme, themes } = useTheme()
</script>

<template>
  <div class="app" :data-theme="theme">
    <AppNav :themes="themes" :theme="theme" @update:theme="theme = $event" />
    <RouterView />
  </div>
</template>
