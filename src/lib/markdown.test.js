import { describe, it, expect } from 'vitest'
import { plainText } from './markdown.js'

describe('plainText conserva guiones dentro de palabras y citas', () => {
  it('quita viñetas pero no los guiones de 38:1-6 ni Ébed-Mélec', () => {
    expect(plainText('- Ébed-Mélec en Jeremías 38:1-6\n- **Valor**\n---\n## Título')).toBe('Ébed-Mélec en Jeremías 38:1-6 Valor Título')
  })
})
