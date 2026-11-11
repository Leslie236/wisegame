import { ref, watch } from 'vue'

import { readStorage, writeStorage } from '@/utils/storage'

export type Theme = 'forest' | 'midnight' | 'ivory' | 'charcoal'

export interface ThemeOption {
  id: Theme
  name: string
  color: string
}

export const themes: ThemeOption[] = [
  { id: 'charcoal', name: '炭黑深色', color: '#292b2e' },
  { id: 'forest', name: '经典绿桌', color: '#387a65' },
  { id: 'midnight', name: '午夜蓝', color: '#526baf' },
  { id: 'ivory', name: '暖色浅色', color: '#e5d5b7' },
]

const STORAGE_KEY = 'wise21-theme'
const DEFAULT_THEME: Theme = 'charcoal'

function isTheme(value: string | null): value is Theme {
  return themes.some((option) => option.id === value)
}

export function useTheme() {
  const stored = readStorage(STORAGE_KEY)
  const theme = ref<Theme>(isTheme(stored) ? stored : DEFAULT_THEME)

  watch(theme, (value) => writeStorage(STORAGE_KEY, value))

  return { theme, themes }
}
