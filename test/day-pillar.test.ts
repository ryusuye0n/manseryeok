import { describe, expect, it } from 'vitest'
import { dayIndexOfDate } from '../src/day-pillar'
import {
  type CivilDateTime,
  DAY_PILLAR_YEARS,
  EARTHLY_BRANCHES,
  getDayPillar,
  HEAVENLY_STEMS,
} from '../src/index'

const at = (year: number, month: number, day: number, hour = 12, minute = 0): CivilDateTime => ({
  year,
  month,
  day,
  hour,
  minute,
})

const name = (time: CivilDateTime, dayChangeAt?: '00:00' | '23:00'): string => {
  const pillar = getDayPillar(time, dayChangeAt === undefined ? undefined : { dayChangeAt })
  return `${pillar.stem}${pillar.branch}`
}

// 외부 라이브러리(lunar-javascript 1.7.8)가 계산한 일주를 1,511일 간격으로 고른 표본이다.
// 1900-01-01부터 2150-12-31 사이 91,676일 전부를 같은 라이브러리와 비교해서 불일치 0개를 확인했고,
// 이 표본은 그중 60갑자가 모두 한 번 이상 나오도록 골랐다.
// 열: 연, 월, 일, 00:00에 날이 바뀔 때(낮 12시)의 일주, 23:00에 날이 바뀔 때(23시 30분)의 일주
const SAMPLES: readonly (readonly [number, number, number, string, string])[] = [
  [1900, 1, 1, '갑술', '을해'],
  [1904, 2, 21, '을유', '병술'],
  [1908, 4, 11, '병신', '정유'],
  [1912, 5, 31, '정미', '무신'],
  [1916, 7, 20, '무오', '기미'],
  [1920, 9, 8, '기사', '경오'],
  [1924, 10, 28, '경진', '신사'],
  [1928, 12, 17, '신묘', '임진'],
  [1933, 2, 5, '임인', '계묘'],
  [1937, 3, 27, '계축', '갑인'],
  [1941, 5, 16, '갑자', '을축'],
  [1945, 7, 5, '을해', '병자'],
  [1949, 8, 24, '병술', '정해'],
  [1953, 10, 13, '정유', '무술'],
  [1957, 12, 2, '무신', '기유'],
  [1962, 1, 21, '기미', '경신'],
  [1966, 3, 12, '경오', '신미'],
  [1970, 5, 1, '신사', '임오'],
  [1974, 6, 20, '임진', '계사'],
  [1978, 8, 9, '계묘', '갑진'],
  [1982, 9, 28, '갑인', '을묘'],
  [1986, 11, 17, '을축', '병인'],
  [1991, 1, 6, '병자', '정축'],
  [1995, 2, 25, '정해', '무자'],
  [1999, 4, 16, '무술', '기해'],
  [2003, 6, 5, '기유', '경술'],
  [2007, 7, 25, '경신', '신유'],
  [2011, 9, 13, '신미', '임신'],
  [2015, 11, 2, '임오', '계미'],
  [2019, 12, 22, '계사', '갑오'],
  [2024, 2, 10, '갑진', '을사'],
  [2028, 3, 31, '을묘', '병진'],
  [2032, 5, 20, '병인', '정묘'],
  [2036, 7, 9, '정축', '무인'],
  [2040, 8, 28, '무자', '기축'],
  [2044, 10, 17, '기해', '경자'],
  [2048, 12, 6, '경술', '신해'],
  [2053, 1, 25, '신유', '임술'],
  [2057, 3, 16, '임신', '계유'],
  [2061, 5, 5, '계미', '갑신'],
  [2065, 6, 24, '갑오', '을미'],
  [2069, 8, 13, '을사', '병오'],
  [2073, 10, 2, '병진', '정사'],
  [2077, 11, 21, '정묘', '무진'],
  [2082, 1, 10, '무인', '기묘'],
  [2086, 3, 1, '기축', '경인'],
  [2090, 4, 20, '경자', '신축'],
  [2094, 6, 9, '신해', '임자'],
  [2098, 7, 29, '임술', '계해'],
  [2102, 9, 18, '계유', '갑술'],
  [2106, 11, 7, '갑신', '을유'],
  [2110, 12, 27, '을미', '병신'],
  [2115, 2, 15, '병오', '정미'],
  [2119, 4, 6, '정사', '무오'],
  [2123, 5, 26, '무진', '기사'],
  [2127, 7, 15, '기묘', '경진'],
  [2131, 9, 3, '경인', '신묘'],
  [2135, 10, 23, '신축', '임인'],
  [2139, 12, 12, '임자', '계축'],
  [2144, 1, 31, '계해', '갑자'],
  [2148, 3, 21, '갑술', '을해'],
  [2150, 12, 31, '기사', '경오'],
]

describe('60갑자 정의', () => {
  it('천간 10개와 지지 12개다', () => {
    expect(HEAVENLY_STEMS.join('')).toBe('갑을병정무기경신임계')
    expect(EARTHLY_BRANCHES.join('')).toBe('자축인묘진사오미신유술해')
  })

  it('정의 배열은 바꿀 수 없다', () => {
    expect(() => {
      ;(HEAVENLY_STEMS as string[]).push('갑')
    }).toThrow(TypeError)
    expect(() => {
      ;(EARTHLY_BRANCHES as string[])[0] = '축'
    }).toThrow(TypeError)
  })
})

describe('getDayPillar: 알려진 날짜', () => {
  it('기준일 2000-01-01은 무오일(54번째)이다', () => {
    expect(getDayPillar(at(2000, 1, 1))).toEqual({ stem: '무', branch: '오', index: 54 })
  })

  it('1900-01-01은 갑술일이다', () => {
    expect(name(at(1900, 1, 1))).toBe('갑술')
  })

  it.each(SAMPLES)(
    '%i-%i-%i의 일주는 %s이고 23시 기준으로는 %s다',
    (year, month, day, midnight, eleven) => {
      expect(name(at(year, month, day, 12))).toBe(midnight)
      expect(name(at(year, month, day, 23, 30), '23:00')).toBe(eleven)
    },
  )

  it('표본이 60갑자를 모두 포함한다', () => {
    expect(new Set(SAMPLES.map((row) => row[3])).size).toBe(60)
  })
})

describe('getDayPillar: 규칙', () => {
  it('하루가 지날 때마다 60갑자가 하나씩 다음으로 간다 (1900~2150년 전체)', () => {
    let previous = getDayPillar(at(1900, 1, 1)).index
    for (let time = Date.UTC(1900, 0, 2); time <= Date.UTC(2150, 11, 31); time += 86_400_000) {
      const date = new Date(time)
      const current = getDayPillar(
        at(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      ).index
      if (current !== (previous + 1) % 60) {
        throw new Error(`${date.toISOString()}에서 ${previous} 다음이 ${current}이다`)
      }
      previous = current
    }
  })

  it('60일마다 같은 일주가 되풀이된다', () => {
    expect(name(at(2024, 2, 4))).toBe(name(at(2024, 4, 4)))
    expect(getDayPillar(at(2024, 4, 4)).index).toBe(getDayPillar(at(2024, 2, 4)).index)
  })

  it('윤일(2월 29일)도 하루로 센다', () => {
    const before = getDayPillar(at(2024, 2, 28)).index
    expect(getDayPillar(at(2024, 2, 29)).index).toBe((before + 1) % 60)
    expect(getDayPillar(at(2024, 3, 1)).index).toBe((before + 2) % 60)
  })

  it('1900년은 윤년이 아니다 (2월 29일은 오류)', () => {
    expect(() => getDayPillar(at(1900, 2, 29))).toThrow(RangeError)
    expect(getDayPillar(at(1900, 3, 1)).index).toBe((getDayPillar(at(1900, 2, 28)).index + 1) % 60)
  })

  it('2000년은 윤년이다 (400년 규칙)', () => {
    expect(getDayPillar(at(2000, 3, 1)).index).toBe((getDayPillar(at(2000, 2, 28)).index + 2) % 60)
  })

  it('시각이 바뀌어도 같은 날이면 일주가 같다 (기본값은 자정에 바뀐다)', () => {
    for (const [hour, minute] of [
      [0, 0],
      [0, 1],
      [12, 0],
      [22, 59],
      [23, 0],
      [23, 59],
    ] as const) {
      expect(name(at(2024, 2, 4, hour, minute))).toBe(name(at(2024, 2, 4, 12)))
    }
    expect(name(at(2024, 2, 5, 0, 0))).not.toBe(name(at(2024, 2, 4, 23, 59)))
  })
})

describe('getDayPillar: 날짜가 바뀌는 시각 옵션', () => {
  const day = at(2024, 2, 4)
  const next = at(2024, 2, 5)

  it('기본값과 "00:00"은 같다', () => {
    expect(getDayPillar(at(2024, 2, 4, 23, 30))).toEqual(
      getDayPillar(at(2024, 2, 4, 23, 30), { dayChangeAt: '00:00' }),
    )
    expect(getDayPillar(at(2024, 2, 4, 23, 30), {})).toEqual(getDayPillar(at(2024, 2, 4, 23, 30)))
  })

  it('"23:00"은 22:59까지는 그날, 23:00부터는 다음 날이다', () => {
    expect(name(at(2024, 2, 4, 22, 59), '23:00')).toBe(name(day))
    expect(name(at(2024, 2, 4, 23, 0), '23:00')).toBe(name(next))
    expect(name(at(2024, 2, 4, 23, 59), '23:00')).toBe(name(next))
    expect(name(at(2024, 2, 5, 0, 0), '23:00')).toBe(name(next))
  })

  it('"23:00"에서 달과 해가 바뀌는 날도 다음 날이 된다', () => {
    expect(name(at(2023, 12, 31, 23, 0), '23:00')).toBe(name(at(2024, 1, 1)))
    expect(name(at(2024, 2, 29, 23, 0), '23:00')).toBe(name(at(2024, 3, 1)))
    // 지원 범위 끝(2150-12-31)의 23:00은 2151-01-01로 넘어가지만 입력 연도가 범위 안이라 계산한다
    const lastDay = getDayPillar(at(2150, 12, 31)).index
    expect(getDayPillar(at(2150, 12, 31, 23, 0), { dayChangeAt: '23:00' }).index).toBe(
      (lastDay + 1) % 60,
    )
  })

  it.each(['23', '2300', 'midnight', '', 0, true, null])(
    'dayChangeAt이 %j이면 RangeError다 (조용히 기본값을 쓰지 않는다)',
    (value) => {
      const options = { dayChangeAt: value } as unknown as { dayChangeAt: '00:00' }
      expect(() => getDayPillar(day, options)).toThrow(RangeError)
    },
  )

  it('options가 null이어도 기본값으로 동작한다', () => {
    expect(getDayPillar(day, null as unknown as undefined)).toEqual(getDayPillar(day))
  })
})

describe('getDayPillar: 잘못된 입력', () => {
  it('지원 범위는 1900~2150년이다', () => {
    expect(DAY_PILLAR_YEARS).toEqual({ first: 1900, last: 2150 })
    expect(() => getDayPillar(at(1899, 12, 31))).toThrow(RangeError)
    expect(() => getDayPillar(at(2151, 1, 1))).toThrow('1900~2150')
    expect(getDayPillar(at(2150, 12, 31, 12)).index).toBeGreaterThanOrEqual(0)
  })

  it.each([
    ['13월', at(2024, 13, 1)],
    ['2월 30일', at(2024, 2, 30)],
    ['24시', at(2024, 2, 4, 24, 0)],
    ['60분', at(2024, 2, 4, 12, 60)],
    ['소수 일', at(2024, 2, 4.5)],
    ['NaN 연도', at(Number.NaN, 2, 4)],
  ])('%s는 RangeError를 낸다', (_label, time) => {
    expect(() => getDayPillar(time)).toThrow(RangeError)
  })

  it('지원 범위 상수는 바꿀 수 없다', () => {
    expect(() => {
      ;(DAY_PILLAR_YEARS as { first: number }).first = 1800
    }).toThrow(TypeError)
  })
})

describe('dayIndexOfDate: 연도 범위 검사 없이 어떤 연도에서도 맞다', () => {
  // 독립 계산: 그레고리력의 율리우스 일수(JDN) 공식(Fliegel & Van Flandern)으로 구한 60갑자 순서.
  // 0갑자일 = (JDN + 49) % 60 이다. 2000-01-01(JDN 2451545)이 무오일(54)이라는 값과 같은 기준이다.
  const julianDayNumber = (year: number, month: number, day: number): number => {
    const a = Math.floor((14 - month) / 12)
    const y = year + 4800 - a
    const m = month + 12 * a - 3
    return (
      day +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) -
      32045
    )
  }

  it.each([
    [1, 1, 1],
    [50, 1, 1],
    [99, 12, 31],
    [100, 1, 1],
    [1582, 10, 15],
    [1900, 1, 1],
    [2000, 1, 1],
    [2150, 12, 31],
    [2400, 2, 29],
  ])('%i-%i-%i의 순서가 JDN 공식과 같다', (year, month, day) => {
    expect(dayIndexOfDate(year, month, day)).toBe((julianDayNumber(year, month, day) + 49) % 60)
  })

  it('0~99년을 1900~1999년으로 바꾸지 않는다 (0~99년의 1월 1일과 7월 1일을 모두 JDN 공식과 비교)', () => {
    for (let year = 0; year <= 99; year++) {
      for (const month of [1, 7]) {
        expect(dayIndexOfDate(year, month, 1), `${year}-${month}-1`).toBe(
          (julianDayNumber(year, month, 1) + 49) % 60,
        )
      }
    }
    expect(dayIndexOfDate(50, 1, 2)).toBe((dayIndexOfDate(50, 1, 1) + 1) % 60)
  })

  it('달의 끝을 넘는 day는 다음 달로 넘어간다', () => {
    expect(dayIndexOfDate(2024, 2, 30)).toBe(dayIndexOfDate(2024, 3, 1))
    expect(dayIndexOfDate(2023, 12, 32)).toBe(dayIndexOfDate(2024, 1, 1))
  })
})
