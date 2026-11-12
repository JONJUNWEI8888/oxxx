import { describe, expect, it } from 'vitest'
import { csvCell } from '../src/csv'

describe('csv cells', () => {
  it('prefixes formula triggers on text and leaves generated numbers alone', () => {
    expect(csvCell('=1+1')).toBe("'=1+1")
    expect(csvCell('+cmd')).toBe("'+cmd")
    expect(csvCell('-2+3')).toBe("'-2+3")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('\tcmd')).toBe("'\tcmd")
    expect(csvCell('\rnote')).toBe("\"'\rnote\"")
    expect(csvCell('=1,2')).toBe(`"'=1,2"`)
    expect(csvCell('0xabc')).toBe('0xabc')
    expect(csvCell('1000', 'number')).toBe('1000')
    expect(csvCell('1234.567890123456789', 'number')).toBe('1234.567890123456789')
    expect(csvCell(`1${'0'.repeat(21)}`, 'number')).toBe(`1${'0'.repeat(21)}`)
  })
})