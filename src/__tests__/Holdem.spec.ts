import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHoldem } from '@/composables/useHoldem'
import { NPC_NAMES } from '@/game/poker/names'

describe('holdem player replacement', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('lets an eligible NPC pay for a swap before its normal action', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    let game!: ReturnType<typeof useHoldem>
    const wrapper = mount(defineComponent({
      setup() {
        game = useHoldem()
        return () => null
      },
    }))
    try {
      game.state.value.seats[3]!.stack = 2000
      game.startNext()
      const before = [...game.state.value.seats[3]!.hole]
      await nextTick()
      await vi.advanceTimersByTimeAsync(550)
      const npc = game.state.value.seats[3]!
      expect(npc.cheatsUsed).toEqual(['swap-card'])
      expect(npc.cheatSpent).toBe(200)
      expect(npc.hole).not.toEqual(before)
      expect(npc.lastAction).not.toBeNull()
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  it.each([0, 0.999999])('replaces busted bots with a new name and random buy-in (%s)', (random) => {
    vi.spyOn(Math, 'random').mockReturnValue(random)
    let game!: ReturnType<typeof useHoldem>
    const wrapper = mount(defineComponent({
      setup() {
        game = useHoldem({ paused: ref(true) })
        return () => null
      },
    }))
    try {
      const names = game.state.value.seats.map((seat) => seat.name)
      expect(new Set(names).size).toBe(4)
      for (const name of names.slice(1)) expect(NPC_NAMES).toContain(name)
      const oldName = game.state.value.seats[1]!.name
      game.state.value.seats[1]!.stack = 0
      game.state.value.seats[2]!.stack = 10
      const shortStackName = game.state.value.seats[2]!.name
      game.startNext()
      const replacement = game.state.value.seats[1]!
      expect(replacement.name).not.toBe(oldName)
      expect(NPC_NAMES).toContain(replacement.name)
      expect(new Set(game.state.value.seats.map((seat) => seat.name)).size).toBe(4)
      // Include posted blinds when checking the incoming player's buy-in.
      expect(replacement.stack + replacement.totalBet).toBe(random === 0 ? 1000 : 5000)
      expect(game.state.value.seats[2]!.name).toBe(shortStackName)
      expect(game.state.value.seats[2]!.stack + game.state.value.seats[2]!.totalBet).toBe(10)
      expect(game.state.value.seats[0]!.name).toBe('你')
      const name = replacement.name
      game.startNext()
      expect(game.state.value.seats[1]!.name).toBe(name)
    } finally {
      wrapper.unmount()
    }
  })
})
