import { describe, expect, it } from 'vitest'
import * as manseryeok from '../src/index'

describe('진입점', () => {
  it('모듈을 불러올 수 있다', () => {
    expect(manseryeok).toBeTypeOf('object')
  })
})
