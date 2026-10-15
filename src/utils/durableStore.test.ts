import { describe, expect, it } from 'vitest'
import { chooseNewest, parseEnvelope } from './durableStore'

describe('durable envelopes', () => {
  it('reads a legacy bare value as an unstamped envelope', () => {
    expect(parseEnvelope('[1,2]')).toEqual({ updatedAt: 0, value: [1, 2] })
  })

  it('prefers the newest stamped copy', () => {
    const chosen = chooseNewest([
      { updatedAt: 10, value: ['local'] },
      null,
      { updatedAt: 25, value: ['cache'] },
      { updatedAt: 20, value: ['idb'] },
    ])
    expect(chosen?.value).toEqual(['cache'])
  })

  it('ignores unreadable copies', () => {
    expect(parseEnvelope('not-json')).toBeNull()
    expect(chooseNewest([null, undefined])).toBeNull()
  })
})