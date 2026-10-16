import { describe, it, expect } from 'vitest'
import { bookPairs } from './books-pairs.js'
import { mulberry, sectionOf } from './logic.js'
import { BOOKS } from '../lib/bible.js'

describe('bookPairs', () => {
  it('usa secciones distintas y los mismos id a ambos lados', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { left, right } = bookPairs(mulberry(seed), 5)
      expect(left).toHaveLength(5)
      expect(right).toHaveLength(5)
      expect(left.map((x) => x.id).sort()).toEqual(right.map((x) => x.id).sort())
      const secs = left.map((x) => sectionOf(BOOKS.indexOf(x.text) + 1))
      expect(new Set(secs).size).toBe(5)
      for (const r of right) expect(secs[left.findIndex((l) => l.id === r.id)]).toBe(r.text)
    }
  })
})
