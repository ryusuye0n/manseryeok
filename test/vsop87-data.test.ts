import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatEarthLongitudeFile, parseEarthLongitude, truncate } from '../scripts/vsop87-data'
import { EARTH_LONGITUDE_SERIES } from '../src/data/earth-longitude.generated'

// 실제 원본과 같은 형식으로 줄여 만든 입력이다. 숫자는 만든 값이다.
const header = (variable: number, power: number, count: number): string =>
  ` VSOP87 VERSION D4    EARTH     VARIABLE ${variable} (LBR)       *T**${power}    ${count} TERMS    HELIOCENTRIC DYNAMICAL ECLIPTIC AND EQUINOX OF THE DATE`
const line = (a: number, b: number, c: number): string =>
  ` 4310    1  0  0  0  0  0  0  0  0  0  0  0  0  0.00000000000     ${a}     ${a} ${b}       ${c} `

const sample = (): string =>
  [
    header(1, 0, 2),
    line(1.5, 0, 0),
    line(0.03, 4.67, 6283.07),
    header(1, 1, 1),
    line(6283.3, 0, 0),
    ...[2, 3, 4, 5].flatMap((power) => [header(1, power, 1), line(0.0001 * power, 1, 2)]),
    header(2, 0, 1),
    line(9, 9, 9),
  ].join('\n')

describe('parseEarthLongitude', () => {
  it('변수 1(황경)의 T**0~T**5 계열만 읽는다', () => {
    const series = parseEarthLongitude(sample())
    expect(series.map((terms) => terms.length)).toEqual([2, 1, 1, 1, 1, 1])
    expect(series[0]?.[0]).toEqual([1.5, 0, 0])
    expect(series[0]?.[1]).toEqual([0.03, 4.67, 6283.07])
  })

  it('헤더의 항 개수와 실제 줄 수가 다르면 오류다', () => {
    const text = sample().replace(header(1, 0, 2), header(1, 0, 3))
    expect(() => parseEarthLongitude(text)).toThrow('항 개수')
  })

  it('숫자가 아닌 줄은 오류다', () => {
    const text = sample().replace(line(1.5, 0, 0), ' 4310 abc def ghi')
    expect(() => parseEarthLongitude(text)).toThrow('항을 읽을 수 없다')
  })
})

describe('truncate', () => {
  it('진폭이 기준 이상인 항만 남긴다 (기준과 같은 값은 남긴다)', () => {
    const series = truncate(parseEarthLongitude(sample()), 0.03)
    expect(series[0]).toEqual([
      [1.5, 0, 0],
      [0.03, 4.67, 6283.07],
    ])
    expect(series[2]).toEqual([])
  })
})

describe('생성된 데이터 파일', () => {
  it('계열이 6개이고 모든 항이 숫자 세 개다', () => {
    expect(EARTH_LONGITUDE_SERIES).toHaveLength(6)
    for (const terms of EARTH_LONGITUDE_SERIES) {
      for (const term of terms) {
        expect(term).toHaveLength(3)
        for (const value of term) expect(Number.isFinite(value)).toBe(true)
      }
    }
  })

  it('첫 항은 VSOP87 T**0 계열의 첫 항이다 (평균 황경 1.75347045673)', () => {
    expect(EARTH_LONGITUDE_SERIES[0]?.[0]).toEqual([1.75347045673, 0, 0])
  })

  it('모든 항의 진폭이 기준(1e-7) 이상이다', () => {
    for (const terms of EARTH_LONGITUDE_SERIES) {
      for (const [amplitude] of terms) expect(amplitude).toBeGreaterThanOrEqual(1e-7)
    }
  })

  it('생성 파일은 생성기가 만든 모양 그대로다 (손으로 고치지 않았다)', () => {
    const onDisk = readFileSync('src/data/earth-longitude.generated.ts', 'utf8').replaceAll(
      '\r\n',
      '\n',
    )
    expect(formatEarthLongitudeFile(EARTH_LONGITUDE_SERIES, 1e-7)).toBe(onDisk)
  })
})
