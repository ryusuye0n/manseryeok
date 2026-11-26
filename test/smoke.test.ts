import { describe, expect, it } from 'vitest'
import * as manseryeok from '../src/index'

describe('진입점', () => {
  it('공개 API를 내보낸다', () => {
    expect(Object.keys(manseryeok).sort()).toEqual([
      'SOLAR_TERM_NAMES',
      'SOLAR_TERM_SUPPORTED_YEARS',
      'SOLAR_TERM_YEARS',
      'getSolarTermPeriod',
      'getSolarTerms',
    ])
  })
})
