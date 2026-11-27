import { describe, expect, it } from 'vitest'
import {
  type CivilDateTime,
  getMonthPillar,
  getSolarTerms,
  getYearPillar,
  SOLAR_TERM_NAMES,
  SOLAR_TERM_SUPPORTED_YEARS,
} from '../src/index'

const at = (year: number, month: number, day: number, hour = 12, minute = 0): CivilDateTime => ({
  year,
  month,
  day,
  hour,
  minute,
})

const year = (time: CivilDateTime): string => {
  const pillar = getYearPillar(time)
  return `${pillar.stem}${pillar.branch}`
}

const month = (time: CivilDateTime): string => {
  const pillar = getMonthPillar(time)
  return `${pillar.stem}${pillar.branch}`
}

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

// 외부 라이브러리(lunar-javascript 1.7.8)가 입춘과 절기 시각 기준으로 계산한 연주와 월주다.
// 1900~2150년 매일 00:00과 12:00의 183,312개를 같은 라이브러리와 비교해서 불일치 0개를 확인했고,
// 이 표본은 그중 3,001개 간격으로 골랐다. (연, 월, 일, 시, 분, 연주, 월주)
const SAMPLES: readonly (readonly [number, number, number, number, number, string, string])[] = [
  [1900, 1, 8, 0, 0, '기해', '정축'],
  [1904, 2, 17, 12, 0, '갑진', '병인'],
  [1908, 3, 28, 0, 0, '무신', '을묘'],
  [1912, 5, 6, 12, 0, '임자', '을사'],
  [1916, 6, 16, 0, 0, '병진', '갑오'],
  [1920, 7, 26, 0, 0, '경신', '계미'],
  [1924, 9, 3, 12, 0, '갑자', '임신'],
  [1928, 10, 13, 0, 0, '무진', '임술'],
  [1932, 11, 21, 12, 0, '임신', '신해'],
  [1936, 12, 31, 12, 0, '병자', '경자'],
  [1941, 2, 9, 0, 0, '신사', '경인'],
  [1945, 3, 20, 12, 0, '을유', '기묘'],
  [1949, 4, 29, 0, 0, '기축', '무진'],
  [1953, 6, 8, 0, 0, '계사', '무오'],
  [1957, 7, 18, 0, 0, '정유', '정미'],
  [1961, 8, 26, 12, 0, '신축', '병신'],
  [1965, 10, 5, 12, 0, '을사', '을유'],
  [1969, 11, 14, 0, 0, '기유', '을해'],
  [1973, 12, 23, 12, 0, '계축', '갑자'],
  [1978, 2, 1, 0, 0, '정사', '계축'],
  [1982, 3, 13, 0, 0, '임술', '계묘'],
  [1986, 4, 22, 0, 0, '병인', '임진'],
  [1990, 6, 1, 0, 0, '경오', '신사'],
  [1994, 7, 10, 12, 0, '갑술', '신미'],
  [1998, 8, 19, 0, 0, '무인', '경신'],
  [2002, 9, 27, 12, 0, '임오', '기유'],
  [2006, 11, 6, 0, 0, '병술', '무술'],
  [2010, 12, 16, 0, 0, '경인', '무자'],
  [2015, 1, 25, 12, 0, '갑오', '정축'],
  [2019, 3, 6, 0, 0, '기해', '병인'],
  [2023, 4, 15, 0, 0, '계묘', '병진'],
  [2027, 5, 24, 12, 0, '정미', '을사'],
  [2031, 7, 3, 0, 0, '신해', '갑오'],
  [2035, 8, 11, 12, 0, '을묘', '갑신'],
  [2039, 9, 20, 0, 0, '기미', '계유'],
  [2043, 10, 29, 12, 0, '계해', '임술'],
  [2047, 12, 8, 12, 0, '정묘', '임자'],
  [2052, 1, 17, 0, 0, '신미', '신축'],
  [2056, 2, 26, 0, 0, '병자', '경인'],
  [2060, 4, 6, 0, 0, '경진', '경진'],
  [2064, 5, 15, 12, 0, '갑신', '기사'],
  [2068, 6, 24, 12, 0, '무자', '무오'],
  [2072, 8, 3, 0, 0, '임진', '정미'],
  [2076, 9, 11, 12, 0, '병신', '정유'],
  [2080, 10, 21, 0, 0, '경자', '병술'],
  [2084, 11, 29, 12, 0, '갑진', '을해'],
  [2089, 1, 8, 12, 0, '무신', '을축'],
  [2093, 2, 17, 12, 0, '계축', '갑인'],
  [2097, 3, 29, 0, 0, '정사', '계묘'],
  [2101, 5, 9, 0, 0, '신유', '계사'],
  [2105, 6, 17, 12, 0, '을축', '임오'],
  [2109, 7, 27, 12, 0, '기사', '신미'],
  [2113, 9, 5, 0, 0, '계유', '경신'],
  [2117, 10, 14, 12, 0, '정축', '경술'],
  [2121, 11, 23, 0, 0, '신사', '기해'],
  [2126, 1, 1, 12, 0, '을유', '무자'],
  [2130, 2, 10, 0, 0, '경인', '무인'],
  [2134, 3, 21, 12, 0, '갑오', '정묘'],
  [2138, 4, 30, 0, 0, '무술', '병진'],
  [2142, 6, 9, 0, 0, '임인', '병오'],
  [2146, 7, 18, 12, 0, '병오', '을미'],
  [2150, 8, 27, 12, 0, '경술', '갑신'],
]

describe('연주', () => {
  it.each(SAMPLES)(
    '%i-%i-%i %i:%i의 연주는 %s이고 월주는 %s다',
    (y, m, d, h, mi, expectedYear, expectedMonth) => {
      expect(year(at(y, m, d, h, mi))).toBe(expectedYear)
      expect(month(at(y, m, d, h, mi))).toBe(expectedMonth)
    },
  )

  it('알려진 해: 1984 갑자, 2000 경진, 2024 갑진, 2044 갑자', () => {
    expect(year(at(1984, 6, 1))).toBe('갑자')
    expect(year(at(2000, 6, 1))).toBe('경진')
    expect(year(at(2024, 6, 1))).toBe('갑진')
    expect(year(at(2044, 6, 1))).toBe('갑자')
  })

  it('60년마다 같은 연주가 되풀이된다', () => {
    expect(year(at(1964, 6, 1))).toBe(year(at(2024, 6, 1)))
    expect(year(at(1904, 6, 1))).toBe(year(at(2024, 6, 1)))
  })

  it('입춘 시각 1분 전까지는 전해이고, 그 순간부터 새해다 (2024-02-04 17:27)', () => {
    expect(year(at(2024, 2, 4, 17, 26))).toBe('계묘')
    expect(year(at(2024, 2, 4, 17, 27))).toBe('갑진')
    expect(year(at(2024, 2, 4, 17, 28))).toBe('갑진')
  })

  it('양력 1월 1일과 설날은 연주가 바뀌지 않는다 (입춘 전이면 전해)', () => {
    expect(year(at(2024, 1, 1, 0, 0))).toBe('계묘')
    expect(year(at(2024, 2, 1, 12, 0))).toBe('계묘')
    expect(year(at(2024, 12, 31, 23, 59))).toBe('갑진')
    expect(year(at(2025, 1, 1, 0, 0))).toBe('갑진')
  })

  it('입춘이 그레고리력으로 어느 날이든 그 순간에 바뀐다 (표 범위 전체, 입춘 직전과 직후)', () => {
    for (let y = 1920; y <= 2028; y++) {
      const lichun = getSolarTerms(y).find((term) => term.name === '입춘')
      if (lichun === undefined) throw new Error('입춘이 없다')
      const before = year(oneMinuteBefore(lichun))
      const after = year(lichun)
      expect(before, `${y}년 입춘 직전`).not.toBe(after)
      expect(getYearPillar(lichun).index, `${y}년`).toBe(
        (getYearPillar(oneMinuteBefore(lichun)).index + 1) % 60,
      )
    }
  })

  it('입춘이 아닌 절기에서는 연주가 바뀌지 않는다', () => {
    for (const term of getSolarTerms(2024)) {
      if (term.name === '입춘') continue
      expect(year(term), term.name).toBe(year(oneMinuteBefore(term)))
    }
  })
})

describe('월주: 월지와 월간', () => {
  // 2024년은 갑진년이라 오호둔으로 인월이 병인이다. 매달 20일은 절기와 멀어서 경계 문제가 없다.
  it('갑진년의 월주는 병인월부터 정축월까지 천간이 하나씩 간다', () => {
    const expected = [
      '병인',
      '정묘',
      '무진',
      '기사',
      '경오',
      '신미',
      '임신',
      '계유',
      '갑술',
      '을해',
      '병자',
      '정축',
    ]
    const dates = [
      at(2024, 2, 20),
      at(2024, 3, 20),
      at(2024, 4, 20),
      at(2024, 5, 20),
      at(2024, 6, 20),
      at(2024, 7, 20),
      at(2024, 8, 20),
      at(2024, 9, 20),
      at(2024, 10, 20),
      at(2024, 11, 20),
      at(2024, 12, 20),
      at(2025, 1, 20),
    ]
    expect(dates.map(month)).toEqual(expected)
  })

  it.each([
    ['갑', 2024, '병인'],
    ['을', 2025, '무인'],
    ['병', 2026, '경인'],
    ['정', 2027, '임인'],
    ['무', 2028, '갑인'],
    ['기', 2029, '병인'],
    ['경', 2030, '무인'],
    ['신', 2031, '경인'],
    ['임', 2032, '임인'],
    ['계', 2033, '갑인'],
  ])('%s년(%i)의 첫 달(인월)은 %s이다 (오호둔)', (_stem, y, expected) => {
    expect(month(at(y, 2, 20))).toBe(expected)
  })

  it('소한 이후 입춘 전의 축월은 전해의 간으로 정한다', () => {
    // 2024-01-20은 아직 계묘년(입춘 전)이라 축월은 계묘년 기준 을축이다
    expect(year(at(2024, 1, 20))).toBe('계묘')
    expect(month(at(2024, 1, 20))).toBe('을축')
  })

  it('대설 이후 소한 전의 자월은 그해 간으로 정한다 (해가 바뀌어도 이어진다)', () => {
    expect(month(at(2023, 12, 20))).toBe('갑자')
    expect(month(at(2024, 1, 3))).toBe('갑자')
  })
})

describe('월주: 절기 경계', () => {
  it('절기 시각 1분 전과 그 순간이 달라지는 것은 12절뿐이다 (1900~2150년 모든 절기, 표 구간과 계산 구간 모두)', () => {
    for (let y = SOLAR_TERM_SUPPORTED_YEARS.first; y <= SOLAR_TERM_SUPPORTED_YEARS.last; y++) {
      for (const term of getSolarTerms(y)) {
        const index = SOLAR_TERM_NAMES.indexOf(term.name)
        // 1900년 첫 소한은 그 전 절기를 몰라서 월주를 구할 수 없다
        if (y === SOLAR_TERM_SUPPORTED_YEARS.first && index === 0) continue
        const before = getMonthPillar(oneMinuteBefore(term))
        const after = getMonthPillar(term)
        const isJie = index % 2 === 0
        if (isJie) {
          // 월지가 한 칸 나아가고, 월간도 한 칸 나아간다. 입춘 때도 연간은 바뀌지만
          // 오호둔 때문에 월주는 끊기지 않고 (을축 -> 병인처럼) 한 칸 나아간다.
          expect(after.branch, `${y} ${term.name}`).not.toBe(before.branch)
          expect(after.index, `${y} ${term.name}`).toBe((before.index + 1) % 60)
        } else {
          expect(after, `${y} ${term.name}`).toEqual(before)
        }
      }
    }
  })

  it('입춘 순간에는 월주도 축월에서 인월로 바뀐다 (2024-02-04 17:27)', () => {
    expect(month(at(2024, 2, 4, 17, 26))).toBe('을축')
    expect(month(at(2024, 2, 4, 17, 27))).toBe('병인')
  })

  it('소한 순간에는 자월에서 축월로 바뀐다 (2024-01-06 05:49)', () => {
    expect(month(at(2024, 1, 6, 5, 48))).toBe('갑자')
    expect(month(at(2024, 1, 6, 5, 49))).toBe('을축')
  })
})

describe('지원 범위와 잘못된 입력', () => {
  it('지원 범위는 절기 조회와 같은 1900~2150년이다', () => {
    expect(SOLAR_TERM_SUPPORTED_YEARS).toEqual({ first: 1900, last: 2150 })
    expect(() => getYearPillar(at(1899, 12, 31))).toThrow(RangeError)
    expect(() => getYearPillar(at(2151, 1, 1))).toThrow('1900~2150')
    expect(() => getMonthPillar(at(1899, 12, 31))).toThrow(RangeError)
    expect(() => getMonthPillar(at(2151, 1, 1))).toThrow(RangeError)
  })

  it('1900년 첫 소한 전은 연주는 되고 월주는 RangeError다 (직전 절기를 알 수 없다)', () => {
    expect(year(at(1900, 1, 1, 0, 0))).toBe('기해')
    expect(() => getMonthPillar(at(1900, 1, 1, 0, 0))).toThrow(RangeError)
    const first = getSolarTerms(1900)[0]
    if (first === undefined) throw new Error('데이터가 비어 있다')
    expect(() => getMonthPillar(oneMinuteBefore(first))).toThrow(RangeError)
    expect(month(first)).toBe('정축')
  })

  it('2150년 마지막 동지 뒤에도 월주가 나온다 (다음 절기를 몰라도 현재 월은 안다)', () => {
    const last = getSolarTerms(2150)[23]
    if (last === undefined) throw new Error('데이터가 비어 있다')
    expect(month(last)).toBe(month(at(2150, 12, 31, 23, 59)))
    expect(getYearPillar(at(2150, 12, 31, 23, 59)).index).toBe(getYearPillar(at(2150, 6, 1)).index)
  })

  it.each([
    ['13월', at(2024, 13, 1)],
    ['2월 30일', at(2024, 2, 30)],
    ['24시', at(2024, 2, 4, 24, 0)],
    ['소수 분', at(2024, 2, 4, 12, 1.5)],
    ['NaN 연도', at(Number.NaN, 2, 4)],
  ])('%s는 RangeError를 낸다', (_label, time) => {
    expect(() => getYearPillar(time)).toThrow(RangeError)
    expect(() => getMonthPillar(time)).toThrow(RangeError)
  })
})
