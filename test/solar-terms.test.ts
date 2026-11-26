import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatDataFile } from '../scripts/solar-term-data'
import { SOLAR_TERM_DATA } from '../src/data/solar-terms.generated'
import {
  type CivilDateTime,
  getSolarTermPeriod,
  getSolarTerms,
  SOLAR_TERM_NAMES,
  SOLAR_TERM_SUPPORTED_YEARS,
  SOLAR_TERM_YEARS,
} from '../src/index'

const at = (year: number, month: number, day: number, hour = 0, minute = 0): CivilDateTime => ({
  year,
  month,
  day,
  hour,
  minute,
})

const toDays = (time: CivilDateTime): number =>
  Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute) / 86_400_000

// 1분 전 시각. 분이 0이면 시, 일, 월, 해가 함께 바뀐다.
const oneMinuteBefore = (time: CivilDateTime): CivilDateTime => {
  const earlier = new Date(
    Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute - 1),
  )
  return at(
    earlier.getUTCFullYear(),
    earlier.getUTCMonth() + 1,
    earlier.getUTCDate(),
    earlier.getUTCHours(),
    earlier.getUTCMinutes(),
  )
}

const allYears: number[] = []
for (let year = SOLAR_TERM_YEARS.first; year <= SOLAR_TERM_YEARS.last; year++) allYears.push(year)

describe('지원 범위', () => {
  it('계산까지 포함하면 1900년부터 2150년까지다', () => {
    expect(SOLAR_TERM_SUPPORTED_YEARS).toEqual({ first: 1900, last: 2150 })
  })

  it('표는 1920년부터 2028년까지다', () => {
    expect(SOLAR_TERM_YEARS).toEqual({ first: 1920, last: 2028 })
    expect(allYears).toHaveLength(109)
  })
})

describe('표 데이터 무결성', () => {
  it('생성 파일은 생성기가 만든 모양 그대로다 (손으로 고치지 않았다)', () => {
    const onDisk = readFileSync(
      new URL('../src/data/solar-terms.generated.ts', import.meta.url),
      'utf8',
    ).replaceAll('\r\n', '\n')
    const rows = new Map(
      Object.entries(SOLAR_TERM_DATA).map(([year, terms]) => [Number(year), terms]),
    )
    expect(formatDataFile(rows, ['1950년 대한'])).toBe(onDisk)
  })

  it.each(allYears)('%i년: 24개이고 이름 순서와 태양황경 순서가 맞다', (year) => {
    const terms = getSolarTerms(year)
    expect(terms.map((term) => term.name)).toEqual([...SOLAR_TERM_NAMES])
    expect(terms.map((term) => term.longitude)).toEqual(
      SOLAR_TERM_NAMES.map((_name, index) => (285 + 15 * index) % 360),
    )
  })

  it.each(allYears)('%i년: 모두 그 해 안에 있고 시각이 올바르며 순서대로 늘어난다', (year) => {
    const terms = getSolarTerms(year)
    for (const term of terms) {
      expect(term.year).toBe(year)
      expect(term.hour).toBeGreaterThanOrEqual(0)
      expect(term.hour).toBeLessThanOrEqual(23)
      expect(term.minute).toBeGreaterThanOrEqual(0)
      expect(term.minute).toBeLessThanOrEqual(59)
    }
    for (let index = 1; index < terms.length; index++) {
      const previous = terms[index - 1]
      const current = terms[index]
      expect(previous && current && toDays(current) > toDays(previous)).toBe(true)
    }
  })

  // 아래 두 점검은 데이터끼리의 정합성이다. 정답과 일치한다는 증명이 아니라
  // 시 단위의 오타나 어긋남을 잡는 용도다. 범위는 실제 데이터(14.714~15.735일,
  // 365.2312~365.2528일)에 여유를 두고 정했다.
  it('연속한 절기 사이 간격은 14.5~16일이다 (해가 바뀌는 곳 포함)', () => {
    const all = allYears.flatMap((year) => getSolarTerms(year))
    for (let index = 1; index < all.length; index++) {
      const previous = all[index - 1]
      const current = all[index]
      if (previous === undefined || current === undefined) throw new Error('데이터가 비어 있다')
      const gap = toDays(current) - toDays(previous)
      expect(gap, `${previous.year} ${previous.name} → ${current.name}`).toBeGreaterThan(14.5)
      expect(gap, `${previous.year} ${previous.name} → ${current.name}`).toBeLessThan(16)
    }
  })

  it('같은 절기가 다음 해에 돌아오기까지는 365.22~365.265일이다', () => {
    for (const year of allYears.slice(0, -1)) {
      const now = getSolarTerms(year)
      const next = getSolarTerms(year + 1)
      for (const [index, term] of now.entries()) {
        const other = next[index]
        if (other === undefined) throw new Error('데이터가 비어 있다')
        const interval = toDays(other) - toDays(term)
        expect(interval, `${year}년 ${term.name}`).toBeGreaterThan(365.22)
        expect(interval, `${year}년 ${term.name}`).toBeLessThan(365.265)
      }
    }
  })
})

describe('알려진 값', () => {
  // API에서 받은 값을 고정한 확인이다. 값이 바뀌면 데이터가 바뀐 것이다.
  it.each([
    [1920, '소한', 1, 6, 23, 41],
    [1950, '입춘', 2, 4, 18, 21],
    [2000, '입춘', 2, 4, 21, 40],
    [2024, '소한', 1, 6, 5, 49],
    [2024, '대한', 1, 20, 23, 7],
    [2024, '입춘', 2, 4, 17, 27],
    [2024, '우수', 2, 19, 13, 13],
    [2028, '동지', 12, 21, 17, 20],
  ] as const)('%i년 %s는 %i월 %i일 %i시 %i분이다', (year, name, month, day, hour, minute) => {
    const term = getSolarTerms(year).find((candidate) => candidate.name === name)
    expect(term).toMatchObject({ year, month, day, hour, minute })
  })

  it('원본이 1월 20일 24:00으로 적은 1950년 대한은 1월 21일 00:00으로 저장되어 있다', () => {
    expect(getSolarTerms(1950)[1]).toMatchObject({
      name: '대한',
      month: 1,
      day: 21,
      hour: 0,
      minute: 0,
    })
  })
})

describe('getSolarTerms', () => {
  it('표가 있는 연도는 표 값이다', () => {
    for (const year of [1920, 2000, 2028]) {
      expect(new Set(getSolarTerms(year).map((term) => term.source))).toEqual(new Set(['table']))
    }
  })

  it('표 밖의 연도는 계산값이고 24개다', () => {
    for (const year of [1900, 1919, 2029, 2150]) {
      const terms = getSolarTerms(year)
      expect(terms).toHaveLength(24)
      expect(new Set(terms.map((term) => term.source))).toEqual(new Set(['calculated']))
      expect(terms.map((term) => term.name)).toEqual([...SOLAR_TERM_NAMES])
    }
  })

  it('계산값도 바꿔서 받아도 다음 조회가 달라지지 않는다 (저장해 둔 값을 복사해 돌려준다)', () => {
    const first = getSolarTerms(2030)
    const original = structuredClone(first)
    first.pop()
    const head = first[0]
    if (head === undefined) throw new Error('데이터가 비어 있다')
    head.minute += 7
    expect(getSolarTerms(2030)).toEqual(original)
  })

  it('지원 범위 상수는 바꿀 수 없다', () => {
    expect(() => {
      ;(SOLAR_TERM_YEARS as { first: number }).first = 1800
    }).toThrow(TypeError)
    expect(() => {
      ;(SOLAR_TERM_SUPPORTED_YEARS as { last: number }).last = 3000
    }).toThrow(TypeError)
    expect(SOLAR_TERM_SUPPORTED_YEARS).toEqual({ first: 1900, last: 2150 })
    expect(getSolarTerms(2150)).toHaveLength(24)
  })

  it('항상 새 배열을 돌려준다 (바꿔도 표가 달라지지 않는다)', () => {
    const first = getSolarTerms(2024)
    first.pop()
    expect(getSolarTerms(2024)).toHaveLength(24)
  })

  it.each([1899, 2151, 1800, 2200, 1920.5, Number.NaN, Number.POSITIVE_INFINITY])(
    '지원하지 않는 연도 %s는 RangeError를 낸다',
    (year) => {
      expect(() => getSolarTerms(year)).toThrow(RangeError)
    },
  )

  it('오류 메시지에 지원 범위가 들어 있다', () => {
    expect(() => getSolarTerms(1899)).toThrow('1900~2150')
  })
})

describe('getSolarTermPeriod', () => {
  it('입춘 시각 1분 전에는 대한, 그 순간부터는 입춘이다', () => {
    const before = getSolarTermPeriod(at(2024, 2, 4, 17, 26))
    expect([before.current.name, before.next.name]).toEqual(['대한', '입춘'])
    const exact = getSolarTermPeriod(at(2024, 2, 4, 17, 27))
    expect([exact.current.name, exact.next.name]).toEqual(['입춘', '우수'])
    const after = getSolarTermPeriod(at(2024, 2, 4, 17, 28))
    expect([after.current.name, after.next.name]).toEqual(['입춘', '우수'])
  })

  it('소한 시각 전후로 구간이 바뀐다 (이전 해의 동지와 이어진다)', () => {
    const before = getSolarTermPeriod(at(2024, 1, 6, 5, 48))
    expect([before.current.name, before.current.year, before.next.name]).toEqual([
      '동지',
      2023,
      '소한',
    ])
    const exact = getSolarTermPeriod(at(2024, 1, 6, 5, 49))
    expect([exact.current.name, exact.next.name]).toEqual(['소한', '대한'])
  })

  it('해가 바뀌는 날에도 동지와 소한 사이로 판정한다', () => {
    for (const time of [at(2023, 12, 31, 23, 59), at(2024, 1, 1, 0, 0)]) {
      const period = getSolarTermPeriod(time)
      expect([period.current.name, period.current.year]).toEqual(['동지', 2023])
      expect([period.next.name, period.next.year]).toEqual(['소한', 2024])
    }
  })

  it('원본이 24:00으로 적었던 1950년 대한은 1월 21일 00:00부터 시작한다', () => {
    const before = getSolarTermPeriod(at(1950, 1, 20, 23, 59))
    expect([before.current.name, before.next.name]).toEqual(['소한', '대한'])
    const exact = getSolarTermPeriod(at(1950, 1, 21, 0, 0))
    expect([exact.current.name, exact.next.name]).toEqual(['대한', '입춘'])
  })

  it('윤일에도 동작한다', () => {
    const period = getSolarTermPeriod(at(2024, 2, 29, 12, 0))
    expect([period.current.name, period.next.name]).toEqual(['우수', '경칩'])
  })

  it('절기 정보(이름, 태양황경, 시각)를 담아 돌려준다', () => {
    expect(getSolarTermPeriod(at(2024, 3, 1)).current).toEqual({
      name: '우수',
      longitude: 330,
      source: 'table',
      year: 2024,
      month: 2,
      day: 19,
      hour: 13,
      minute: 13,
    })
  })

  describe('표와 계산의 이음매', () => {
    it('2028년 마지막 동지 뒤에는 2029년 소한(계산값)이 다음 절기다', () => {
      const period = getSolarTermPeriod(at(2028, 12, 31, 12, 0))
      expect([period.current.name, period.current.source]).toEqual(['동지', 'table'])
      expect([period.next.name, period.next.year, period.next.source]).toEqual([
        '소한',
        2029,
        'calculated',
      ])
    })

    it('1919년 동지(계산값) 뒤에는 1920년 소한(표 값)이 다음 절기다', () => {
      const period = getSolarTermPeriod(at(1920, 1, 1, 0, 0))
      expect([period.current.name, period.current.source]).toEqual(['동지', 'calculated'])
      expect([period.next.name, period.next.source]).toEqual(['소한', 'table'])
    })
  })

  describe('지원 범위의 처음과 끝', () => {
    it('1900년 첫 소한 시각부터는 조회되고, 1분 전은 RangeError다', () => {
      const first = getSolarTerms(1900)[0]
      if (first === undefined) throw new Error('데이터가 비어 있다')
      expect(getSolarTermPeriod(first).current.name).toBe('소한')
      expect(() => getSolarTermPeriod(oneMinuteBefore(first))).toThrow(RangeError)
      expect(() => getSolarTermPeriod(at(1899, 12, 31, 23, 59))).toThrow(RangeError)
    })

    it('2150년 마지막 동지 직전까지는 조회되고, 그 시각부터는 RangeError다', () => {
      const last = getSolarTerms(2150)[23]
      if (last === undefined) throw new Error('데이터가 비어 있다')
      expect(() => getSolarTermPeriod(last)).toThrow(RangeError)
      expect(() => getSolarTermPeriod(at(2151, 1, 1))).toThrow(RangeError)
      const before = getSolarTermPeriod(oneMinuteBefore(last))
      expect([before.current.name, before.next.name]).toEqual(['대설', '동지'])
    })
  })

  describe('입력 시각의 기준', () => {
    // 입력을 UTC+9 표준시로 보고 표와 그대로 비교한다. 서머타임이나 UTC+8:30의 벽시계 시각은
    // 변환하지 않으므로, 호출하는 쪽이 표준시로 바꿔서 넣어야 한다는 점을 고정해 둔다.
    it('1988년 소서(07-07 06:33)는 입력한 시각을 변환 없이 비교한다', () => {
      expect(getSolarTermPeriod(at(1988, 7, 7, 6, 32)).current.name).toBe('하지')
      expect(getSolarTermPeriod(at(1988, 7, 7, 6, 33)).current.name).toBe('소서')
    })

    it('서머타임 중 벽시계 06:40(표준시 05:40)을 그대로 넣으면 소서가 나온다 (표준시로 바꿔 넣으면 하지)', () => {
      expect(getSolarTermPeriod(at(1988, 7, 7, 6, 40)).current.name).toBe('소서')
      expect(getSolarTermPeriod(at(1988, 7, 7, 5, 40)).current.name).toBe('하지')
    })
  })

  describe('잘못된 입력', () => {
    it.each([
      ['13월', at(2024, 13, 1)],
      ['0월', at(2024, 0, 1)],
      ['2월 30일', at(2024, 2, 30)],
      ['평년 2월 29일', at(2023, 2, 29)],
      ['24시', at(2024, 2, 4, 24, 0)],
      ['60분', at(2024, 2, 4, 12, 60)],
      ['음수 시', at(2024, 2, 4, -1, 0)],
      ['소수 분', at(2024, 2, 4, 12, 1.5)],
      ['NaN 연도', at(Number.NaN, 2, 4)],
    ])('%s는 RangeError를 낸다', (_name, time) => {
      expect(() => getSolarTermPeriod(time)).toThrow(RangeError)
    })
  })
})
