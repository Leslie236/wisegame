import { ref, watch } from 'vue'

import { readStorage, writeStorage } from '@/utils/storage'

export const WALLET_KEY = 'wise21-balance'
export const STARTING_BALANCE = 1000

function initialBalance(): number {
  const stored = Number(readStorage(WALLET_KEY) ?? STARTING_BALANCE)
  return Number.isFinite(stored) && stored >= 0 ? stored : STARTING_BALANCE
}

/**
 * The shared chip wallet used by every game in the room.
 * Each mounted view gets its own reactive copy backed by the same storage key.
 */
export function useWallet() {
  const balance = ref(initialBalance())
  watch(balance, (value) => writeStorage(WALLET_KEY, String(value)))
  return { balance }
}
