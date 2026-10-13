import { describe, expect, it } from 'vitest'
import { safariUrl } from './external.js'

const IOS18 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const IOS16 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_10 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'

describe('enlaces de fuera', () => {
  it('en iPhone con iOS 17 o más se abren en Safari', () => {
    expect(safariUrl('https://wol.jw.org/es/wol/h/r4/lp-s', IOS18)).toBe('x-safari-https://wol.jw.org/es/wol/h/r4/lp-s')
  })
  it('en iOS viejo o fuera del iPhone se quedan igual', () => {
    expect(safariUrl('https://wol.jw.org/', IOS16)).toBe(null)
    expect(safariUrl('https://wol.jw.org/', 'Mozilla/5.0 (Windows NT 10.0)')).toBe(null)
  })
  it('no toca enlaces que no son de internet', () => {
    expect(safariUrl('jwlibrary:///finder?wtlocale=S', IOS18)).toBe(null)
    expect(safariUrl('#x', IOS18)).toBe(null)
  })
})
