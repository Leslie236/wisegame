import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHoldem } from '@/composables/useHoldem'

describe('holdem player replacement', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it.each([0, 0.999999])('replaces busted bots with a new name and random buy-in (%s)', (random) => {
    let game!: ReturnType<typeof useHoldem>
    const wrapper = mount(defineComponent({
      setup() {
        game = useHoldem({ paused: ref(true) })
        return () => null
      },
    }))
    try {
      const oldName = game.state.value.seats[1]!.name
      game.state.value.seats[1]!.stack = 0
      game.state.value.seats[2]!.stack = 10
      const shortStackName = game.state.value.seats[2]!.name
      vi.spyOn(Math, 'random').mockReturnValue(random)
      game.startNext()
      const replacement = game.state.value.seats[1]!
      expect(replacement.name).not.toBe(oldName)
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
