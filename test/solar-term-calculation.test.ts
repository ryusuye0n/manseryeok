import { describe, expect, it } from 'vitest'
import { SOLAR_TERM_DATA } from '../src/data/solar-terms.generated'
import { apparentSolarLongitude, deltaT } from '../src/solar-longitude'
import {
  calculateSolarTermTimes,
  SOLAR_TERM_CALCULATION_YEARS,
} from '../src/solar-term-calculation'
import { SOLAR_TERM_NAMES } from '../src/solar-term-names'

interface Time {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

const toMinutes = (time: Time): number =>
  Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute) / 60_000

const tableMinutes = (year: number, index: number): number => {
  const text = SOLAR_TERM_DATA[year]?.[index]
  if (text === undefined) throw new Error(`표에 없다: ${year} ${index}`)
  const [month, day, hour, minute] = [
    Number(text.slice(0, 2)),
    Number(text.slice(2, 4)),
    Number(text.slice(4, 6)),
    Number(text.slice(6, 8)),
  ]
  return toMinutes({ year, month, day, hour, minute })
}

const tableYears = Object.keys(SOLAR_TERM_DATA).map(Number)
const differences = tableYears.flatMap((year) =>
  calculateSolarTermTimes(year).map((time, index) => ({
    year,
    index,
    minutes: toMinutes(time) - tableMinutes(year, index),
  })),
)

const calculationYears = Array.from(
  { length: SOLAR_TERM_CALCULATION_YEARS.last - SOLAR_TERM_CALCULATION_YEARS.first + 1 },
  (_value, offset) => SOLAR_TERM_CALCULATION_YEARS.first + offset,
)

describe('태양 황경 계산', () => {
  // Meeus 25장 예제(1992년 10월 13일 0h TD)의 단순 공식 결과는 199.90895도이고 정밀도는 0.01도다.
  // 정밀한 정확도는 아래 표 비교 테스트가 확인한다. 여기서는 단순 공식과 크게 어긋나지 않는지만 본다.
  it('책의 단순 공식 결과와 그 공식의 정밀도(0.01도) 안에서 같다', () => {
    expect(Math.abs(apparentSolarLongitude(2448908.5) - 199.90895)).toBeLessThan(0.01)
  })

  it('항상 0 이상 360 미만이다', () => {
    for (let jde = 2415020; jde < 2470000; jde += 997) {
      const longitude = apparentSolarLongitude(jde)
      expect(longitude).toBeGreaterThanOrEqual(0)
      expect(longitude).toBeLessThan(360)
    }
  })

  it('하루에 약 1도씩 늘어난다', () => {
    const first = apparentSolarLongitude(2460000.5)
    const second = apparentSolarLongitude(2460001.5)
    const moved = (second - first + 360) % 360
    expect(moved).toBeGreaterThan(0.95)
    expect(moved).toBeLessThan(1.02)
  })
})

describe('ΔT', () => {
  it.each([
    [1900, -2.79],
    [1950, 29.07],
    [1975, 45.45],
    [2000, 63.86],
  ])('%i년은 %f초다 (다항식의 기준 연도)', (year, seconds) => {
    expect(deltaT(year)).toBeCloseTo(seconds, 2)
  })

  it('연도 구간이 바뀌는 곳에서 값이 이어진다 (1초 안)', () => {
    for (const year of [1920, 1941, 1961, 1986, 2005, 2050]) {
      expect(Math.abs(deltaT(year) - deltaT(year - 1e-9))).toBeLessThan(1)
    }
  })

  it('소수 연도를 받는다 (1900년 1월 1일부터 2150년 12월 31일까지)', () => {
    expect(Number.isFinite(deltaT(2150.96))).toBe(true)
    expect(deltaT(2100.5)).toBeGreaterThan(deltaT(2100.0))
    expect(() => deltaT(1899.99)).toThrow(RangeError)
    expect(() => deltaT(2151)).toThrow(RangeError)
  })

  it('연도 안에서도 달라진다 (같은 해 동지가 소한보다 ΔT가 크다)', () => {
    expect(deltaT(2100.96)).toBeGreaterThan(deltaT(2100.04))
  })
})

describe('절기 시각 계산', () => {
  it('연도마다 24개이고 그 해 안에서 시각 순서대로 늘어난다', () => {
    for (const year of calculationYears) {
      const times = calculateSolarTermTimes(year)
      expect(times).toHaveLength(24)
      for (const time of times) expect(time.year).toBe(year)
      for (let index = 1; index < times.length; index++) {
        const previous = times[index - 1]
        const current = times[index]
        if (previous === undefined || current === undefined) throw new Error('데이터가 비어 있다')
        const gapDays = (toMinutes(current) - toMinutes(previous)) / 1440
        expect(gapDays, `${year}년 ${SOLAR_TERM_NAMES[index]}`).toBeGreaterThan(14.5)
        expect(gapDays, `${year}년 ${SOLAR_TERM_NAMES[index]}`).toBeLessThan(16)
      }
    }
  })

  it('같은 절기가 다음 해에 돌아오기까지는 365.22~365.265일이다', () => {
    for (const year of calculationYears.slice(0, -1)) {
      const now = calculateSolarTermTimes(year)
      const next = calculateSolarTermTimes(year + 1)
      for (const [index, time] of now.entries()) {
        const other = next[index]
        if (other === undefined) throw new Error('데이터가 비어 있다')
        const days = (toMinutes(other) - toMinutes(time)) / 1440
        expect(days, `${year}년 ${SOLAR_TERM_NAMES[index]}`).toBeGreaterThan(365.22)
        expect(days, `${year}년 ${SOLAR_TERM_NAMES[index]}`).toBeLessThan(365.265)
      }
    }
  })

  it.each([1899, 2151, 2024.5, Number.NaN])('지원하지 않는 연도 %s는 RangeError다', (year) => {
    expect(() => calculateSolarTermTimes(year)).toThrow(RangeError)
  })
})

describe('한국천문연구원 표와 비교 (1920~2028년 2,616개)', () => {
  it('모든 절기가 표와 1분 안에서 같다', () => {
    const off = differences.filter((entry) => Math.abs(entry.minutes) > 1)
    expect(off).toEqual([])
  })

  // 계산 오차는 초 단위로 몇 초이고 표는 분으로 반올림되어 있다.
  // 분 경계에 걸린 절기가 1분 어긋난다. 측정값은 94.0%(2,459개)가 정확히 같다.
  it('정확히 같은 절기가 92% 이상이다', () => {
    const exact = differences.filter((entry) => entry.minutes === 0).length
    expect(exact / differences.length).toBeGreaterThan(0.92)
  })

  it.each([
    ['1920~1953년', 1920, 1953],
    ['1954~1961년 (UTC+8:30 시기)', 1954, 1961],
    ['1962~2028년', 1962, 2028],
  ])('%s에도 모두 1분 안이다', (_label, from, to) => {
    const range = differences.filter((entry) => entry.year >= from && entry.year <= to)
    expect(range.length).toBeGreaterThan(0)
    for (const entry of range) expect(Math.abs(entry.minutes)).toBeLessThanOrEqual(1)
  })

  it('한쪽으로 쏠리지 않는다 (1분 늦은 것과 빠른 것의 개수 차이가 전체의 3% 안)', () => {
    const late = differences.filter((entry) => entry.minutes === 1).length
    const early = differences.filter((entry) => entry.minutes === -1).length
    expect(Math.abs(late - early) / differences.length).toBeLessThan(0.03)
  })

  it.each([
    [2024, 2, 4, 17, 27],
    [2000, 2, 4, 21, 40],
    [1950, 2, 4, 18, 21],
  ])('%i년 입춘은 표와 같은 %i월 %i일 %i시 %i분이다', (year, month, day, hour, minute) => {
    expect(calculateSolarTermTimes(year)[2]).toMatchObject({ year, month, day, hour, minute })
  })
})
