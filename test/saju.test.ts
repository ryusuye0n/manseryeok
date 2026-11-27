import { describe, expect, it } from 'vitest'
import {
  type BirthInput,
  type CivilDateTime,
  getDayPillar,
  getHourPillar,
  getMonthPillar,
  getSaju,
  getSolarTerms,
  getYearPillar,
  type Pillar,
  SOLAR_TERM_NAMES,
  toKoreaStandardTime,
} from '../src/index'

const birth = (
  year: number,
  month: number,
  day: number,
  hour?: number,
  minute?: number,
): BirthInput =>
  hour === undefined ? { year, month, day } : { year, month, day, hour, minute: minute ?? 0 }

const name = (pillar: Pillar | null): string =>
  pillar === null ? '없음' : `${pillar.stem}${pillar.branch}`

const summary = (input: BirthInput, options?: Parameters<typeof getSaju>[1]): string => {
  const { pillars } = getSaju(input, options)
  return [pillars.year, pillars.month, pillars.day, pillars.hour].map(name).join(' ')
}

// 독립 계산 표본: Node의 시간대 데이터(Asia/Seoul)로 벽시계 시각을 만들고, 같은 순간의 표준시를
// 외부 라이브러리(lunar-javascript 1.7.8)에 넣어 연주, 월주, 일주, 시주를 얻었다. 이 라이브러리의 시간대 변환은 거치지 않는다.
// (벽시계 연, 월, 일, 시, 분, 연주 월주 일주 시주). 시간대가 바뀌는 해(1908~1961, 1987~1988년)는 낮 시각만 골랐다.
const KNOWN: readonly (readonly [number, number, number, number, number, string])[] = [
  [2117, 2, 20, 8, 59, '정축 임인 임술 갑진'],
  [2002, 4, 21, 11, 24, '임오 갑진 기미 경오'],
  [1913, 5, 1, 4, 48, '계축 병진 임오 임인'],
  [2059, 9, 6, 19, 57, '기묘 임신 병자 무술'],
  [2021, 6, 26, 8, 19, '신축 갑오 을사 경진'],
  [1996, 1, 21, 6, 14, '을해 기축 정사 계묘'],
  [2124, 12, 15, 10, 28, '갑신 병자 정유 을사'],
  [2057, 2, 9, 16, 35, '정축 임인 정유 무신'],
  [2036, 10, 3, 1, 50, '병진 정유 계묘 계축'],
  [2133, 1, 23, 8, 20, '임진 계축 무오 병진'],
  [2054, 4, 30, 15, 27, '갑술 무진 신축 병신'],
  [1952, 10, 10, 19, 25, '임진 경술 기축 갑술'],
  [2120, 8, 25, 11, 13, '경진 갑신 갑신 경오'],
  [2128, 7, 9, 14, 13, '무자 기미 기묘 신미'],
  [1981, 3, 4, 14, 27, '신유 경인 신사 을미'],
  [2049, 12, 17, 23, 31, '기사 병자 병인 경자'],
  [1997, 6, 15, 23, 27, '정축 병오 무자 갑자'],
  [2045, 2, 20, 19, 33, '을축 무인 을사 병술'],
  [2056, 1, 30, 9, 1, '을해 기축 신사 계사'],
  [1920, 4, 7, 21, 33, '경신 경진 을미 정해'],
  [1935, 6, 7, 15, 14, '을해 임오 갑인 임신'],
  [2127, 4, 11, 18, 1, '정해 갑진 갑진 계유'],
  [2079, 1, 12, 4, 4, '무술 을축 갑자 병인'],
  [1937, 3, 15, 14, 2, '정축 계묘 신축 을미'],
  [1928, 9, 3, 8, 37, '무진 경신 병오 임진'],
  [1964, 8, 26, 20, 1, '갑진 임신 정미 경술'],
  [1971, 3, 8, 8, 50, '신해 신묘 임진 갑진'],
  [2092, 4, 13, 13, 17, '임자 갑진 갑진 신미'],
  [2050, 5, 16, 11, 16, '경오 신사 병신 갑오'],
  [1970, 8, 30, 5, 32, '경술 갑신 임오 계묘'],
  [2094, 3, 8, 6, 34, '갑인 정묘 무인 을묘'],
  [2054, 7, 21, 16, 52, '갑술 신미 계해 경신'],
  [1971, 10, 18, 14, 46, '신해 무술 병자 을미'],
  [1917, 6, 17, 17, 41, '정사 병오 경인 을유'],
  [2052, 5, 23, 12, 21, '임신 을사 갑인 경오'],
  [2132, 6, 20, 6, 15, '임진 병오 신사 신묘'],
  [1938, 7, 28, 5, 36, '무인 기미 신유 신묘'],
  [2051, 8, 30, 6, 57, '신미 병신 정해 계묘'],
  [2061, 4, 24, 12, 28, '신사 임진 임신 병오'],
  [2029, 9, 28, 20, 6, '기유 계유 신유 무술'],
  [2039, 1, 22, 3, 26, '무오 을축 갑진 병인'],
  [2074, 10, 10, 16, 45, '갑오 갑술 기사 임신'],
  [1939, 10, 3, 2, 4, '기묘 계유 계유 계축'],
  [1927, 11, 21, 5, 17, '정묘 신해 기미 정묘'],
  [2034, 5, 7, 19, 11, '갑인 기사 계해 임술'],
  [2026, 12, 5, 14, 49, '병오 기해 계축 기미'],
  [2040, 2, 24, 23, 36, '경신 무인 임오 임자'],
  [1991, 12, 23, 21, 34, '신미 경자 정묘 신해'],
  [1965, 5, 10, 11, 51, '을사 신사 갑자 경오'],
  [2001, 6, 12, 23, 20, '신사 갑오 병오 경자'],
  [1928, 4, 25, 7, 2, '무진 병진 을미 경진'],
  [1959, 8, 28, 21, 19, '기해 임신 임오 경술'],
  [2029, 8, 1, 12, 53, '기유 신미 계해 무오'],
  [2048, 8, 30, 22, 17, '무진 경신 임신 신해'],
  [2134, 5, 2, 9, 53, '갑오 무진 임인 을사'],
  [2058, 5, 12, 21, 20, '무인 정사 갑술 을해'],
  [1917, 3, 22, 1, 11, '정사 계묘 계해 계축'],
  [1996, 7, 12, 17, 7, '병자 을미 경술 을유'],
  [2036, 5, 17, 16, 31, '병진 계사 갑신 임신'],
  [1937, 6, 21, 10, 1, '정축 병오 기묘 기사'],
  [2112, 10, 10, 9, 42, '임신 경술 무자 정사'],
  [1960, 2, 4, 7, 28, '기해 정축 임술 갑진'],
  [1969, 8, 2, 1, 32, '기유 신미 기유 을축'],
  [1995, 1, 13, 12, 12, '갑술 정축 갑진 경오'],
  [1918, 9, 19, 22, 46, '무오 신유 기사 을해'],
  [2120, 1, 24, 13, 40, '기묘 정축 경술 계미'],
  [1950, 8, 5, 21, 48, '경인 계미 임신 경술'],
  [2046, 10, 28, 5, 9, '병인 무술 경신 기묘'],
  [2123, 8, 29, 17, 25, '계미 경신 계묘 신유'],
  [2012, 1, 12, 7, 56, '신묘 신축 임신 갑진'],
]

// 시각을 모르는 경우: 그날 정오 기준 연주, 월주, 일주. (연, 월, 일, 연주 월주 일주)
const UNKNOWN: readonly (readonly [number, number, number, string])[] = [
  [1928, 4, 25, '무진 병진 을미'],
  [2110, 12, 16, '경오 무자 갑신'],
  [2081, 8, 13, '신축 병신 무신'],
  [1918, 1, 8, '정사 계축 을묘'],
  [2121, 12, 21, '신사 경자 정해'],
  [2137, 7, 21, '정유 정미 무인'],
  [2138, 8, 24, '무술 경신 정사'],
  [1938, 2, 12, '무인 갑인 을해'],
  [2034, 8, 7, '갑인 신미 을미'],
  [2123, 6, 25, '계미 무오 무술'],
  [2025, 11, 28, '을사 정해 신축'],
  [2119, 4, 7, '기묘 무진 무오'],
  [2143, 11, 19, '계묘 계해 경술'],
  [2063, 3, 20, '계미 을묘 정미'],
  [2076, 8, 3, '병신 을미 임신'],
  [2010, 7, 22, '경인 계미 계유'],
  [1913, 9, 1, '계축 경신 을유'],
  [2039, 2, 20, '기미 병인 계유'],
  [2127, 6, 20, '정해 병오 갑인'],
  [2024, 8, 5, '갑진 신미 신축'],
  [2014, 4, 4, '갑오 정묘 을사'],
  [2038, 7, 15, '무오 기미 계사'],
  [2006, 5, 21, '병술 계사 경술'],
  [2092, 1, 18, '신해 신축 무인'],
  [1956, 7, 5, '병신 갑오 계유'],
]

describe('getSaju: 독립 계산과 비교', () => {
  it.each(KNOWN)('%i-%i-%i %i:%i의 사주', (year, month, day, hour, minute, expected) => {
    expect(summary(birth(year, month, day, hour, minute))).toBe(expected)
  })

  it.each(UNKNOWN)('%i-%i-%i 시각 모름의 사주', (year, month, day, expected) => {
    expect(summary(birth(year, month, day))).toBe(`${expected} 없음`)
  })
})

describe('getSaju: 구성', () => {
  it('개별 함수와 같은 값을 합친다 (알려진 값 2024-02-04 17:27)', () => {
    const saju = getSaju(birth(2024, 2, 4, 17, 27))
    const standard: CivilDateTime = { year: 2024, month: 2, day: 4, hour: 17, minute: 27 }
    expect(saju.pillars.year).toEqual(getYearPillar(standard))
    expect(saju.pillars.month).toEqual(getMonthPillar(standard))
    expect(saju.pillars.day).toEqual(getDayPillar(standard))
    expect(saju.pillars.hour).toEqual(getHourPillar(standard))
    expect(saju.standardTime).toEqual(standard)
    expect(summary(birth(2024, 2, 4, 17, 27))).toBe('갑진 병인 무술 신유')
  })

  it('시각을 모르면 시주만 null이고 standardTime도 null이다', () => {
    const saju = getSaju(birth(2024, 6, 15))
    expect(saju.pillars.hour).toBeNull()
    expect(saju.standardTime).toBeNull()
    expect(saju.warnings).toEqual([])
    expect(saju.pillars.day).toEqual(
      getDayPillar({ year: 2024, month: 6, day: 15, hour: 12, minute: 0 }),
    )
  })

  it('서머타임 시기의 벽시계 시각은 표준시로 바꿔서 계산한다 (1988-07-07 06:40은 표준시 05:40)', () => {
    const saju = getSaju(birth(1988, 7, 7, 6, 40))
    expect(saju.standardTime).toEqual({ year: 1988, month: 7, day: 7, hour: 5, minute: 40 })
    // 소서(06:33) 전이라 월지는 아직 오월이다 (소서 이후라면 미월)
    expect(saju.pillars.month.branch).toBe('오')
    expect(saju.pillars.hour?.branch).toBe('묘')
  })

  it('UTC+8:30 시기도 표준시로 바꾼다 (1957-01-15 12:00은 표준시 12:30)', () => {
    expect(getSaju(birth(1957, 1, 15, 12, 0)).standardTime).toEqual({
      year: 1957,
      month: 1,
      day: 15,
      hour: 12,
      minute: 30,
    })
  })

  it('변환으로 날짜가 바뀌면 바뀐 날짜로 계산한다 (1988-07-07 00:30 서머타임은 표준시로 전날 23:30)', () => {
    const saju = getSaju(birth(1988, 7, 7, 0, 30))
    expect(saju.standardTime).toEqual({ year: 1988, month: 7, day: 6, hour: 23, minute: 30 })
    expect(saju.pillars.day).toEqual(
      getDayPillar({ year: 1988, month: 7, day: 6, hour: 12, minute: 0 }),
    )
  })

  it('UTC+8:30 시기의 입춘 직전 벽시계는 표준시로 바꾸면 이미 새해다 (연주와 월주도 표준시로 정한다)', () => {
    // 1957년 입춘 시각보다 벽시계로 20분 전은 표준시(+30분)로는 입춘 10분 뒤다
    const lichun = getSolarTerms(1957).find((term) => term.name === '입춘')
    if (lichun === undefined) throw new Error('입춘이 없다')
    const shifted = (minutes: number): CivilDateTime => {
      const date = new Date(Date.UTC(1957, 1, lichun.day, lichun.hour, lichun.minute + minutes))
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
      }
    }
    const wallTime = shifted(-20)
    const saju = getSaju(wallTime)
    const standard = shifted(10)
    expect(saju.standardTime).toEqual(standard)
    expect(saju.pillars.year).toEqual(getYearPillar(standard))
    expect(saju.pillars.month).toEqual(getMonthPillar(standard))
    // 벽시계 시각 그대로 계산했다면 입춘 전이라 전해(병신)가 나온다
    expect(name(saju.pillars.year)).toBe('정유')
    expect(name(getYearPillar(wallTime))).toBe('병신')
  })

  it('시계가 건너뛴 시각은 RangeError다 (1948-06-01 00:30)', () => {
    expect(() => getSaju(birth(1948, 6, 1, 0, 30))).toThrow(RangeError)
  })

  it('결과는 호출마다 새 객체다', () => {
    const first = getSaju(birth(2024, 2, 4, 17, 27))
    first.warnings.push({ type: 'night-zi', dayChangeAt: '00:00' })
    expect(
      getSaju(birth(2024, 2, 4, 17, 27)).warnings.some((warning) => warning.type === 'night-zi'),
    ).toBe(false)
  })
})

describe('getSaju: 절기 경계 경고', () => {
  it('입춘 직전과 직후의 연주와 월주가 바뀌고, 앞뒤 2분 안이면 경고한다 (2024-02-04 17:27)', () => {
    const before = getSaju(birth(2024, 2, 4, 17, 26))
    const at = getSaju(birth(2024, 2, 4, 17, 27))
    const after = getSaju(birth(2024, 2, 4, 17, 28))
    expect(name(before.pillars.year)).toBe('계묘')
    expect(name(at.pillars.year)).toBe('갑진')
    expect(name(after.pillars.year)).toBe('갑진')
    expect(before.warnings).toEqual([
      {
        type: 'solar-term-near',
        term: '입춘',
        minutesFromTerm: -1,
        source: 'table',
        affects: ['year', 'month'],
      },
    ])
    expect(at.warnings).toEqual([
      {
        type: 'solar-term-near',
        term: '입춘',
        minutesFromTerm: 0,
        source: 'table',
        affects: ['year', 'month'],
      },
    ])
    expect(after.warnings[0]).toMatchObject({ minutesFromTerm: 1 })
  })

  it('표 구간은 2분까지만 경고하고 3분부터는 경고하지 않는다', () => {
    expect(getSaju(birth(2024, 2, 4, 17, 25)).warnings).toHaveLength(1)
    expect(getSaju(birth(2024, 2, 4, 17, 29)).warnings).toHaveLength(1)
    expect(getSaju(birth(2024, 2, 4, 17, 24)).warnings).toEqual([])
    expect(getSaju(birth(2024, 2, 4, 17, 30)).warnings).toEqual([])
  })

  it('입춘이 아닌 절기는 월주만 영향을 받는다 (2024-01-06 05:49 소한)', () => {
    expect(getSaju(birth(2024, 1, 6, 5, 49)).warnings).toEqual([
      {
        type: 'solar-term-near',
        term: '소한',
        minutesFromTerm: 0,
        source: 'table',
        affects: ['month'],
      },
    ])
  })

  it('중기(대한, 우수 ...)는 월주를 바꾸지 않으므로 경고하지 않는다 (2024-02-19 13:13 우수)', () => {
    expect(getSaju(birth(2024, 2, 19, 13, 13)).warnings).toEqual([])
  })

  it('표 밖 계산값 구간은 앞뒤 10분(21분)까지 경고하고 출처를 calculated로 표시한다 (2030-02-04 입춘)', () => {
    const near = Array.from({ length: 24 * 60 }, (_value, index) =>
      getSaju(birth(2030, 2, 4, Math.floor(index / 60), index % 60)).warnings.find(
        (warning) => warning.type === 'solar-term-near',
      ),
    ).filter((warning) => warning !== undefined)
    expect(near).toHaveLength(21)
    for (const warning of near) {
      expect(warning).toMatchObject({
        term: '입춘',
        source: 'calculated',
        affects: ['year', 'month'],
      })
    }
  })

  it('시각을 모르는데 그날 안에 절기가 있으면 경고한다 (2024-02-04는 입춘 17:27)', () => {
    expect(getSaju(birth(2024, 2, 4)).warnings).toEqual([
      {
        type: 'solar-term-on-day',
        term: '입춘',
        time: { year: 2024, month: 2, day: 4, hour: 17, minute: 27 },
        affects: ['year', 'month'],
      },
    ])
    expect(getSaju(birth(2024, 2, 5)).warnings).toEqual([])
  })

  it('시각을 모르면 그날 정오를 기준으로 한다 (오전에 소한이 있는 2024-01-06은 이미 축월)', () => {
    // 소한이 05:49라서 정오에는 을축월, 자정에는 갑자월이다
    const saju = getSaju(birth(2024, 1, 6))
    expect(name(saju.pillars.month)).toBe('을축')
    expect(saju.warnings).toEqual([
      {
        type: 'solar-term-on-day',
        term: '소한',
        time: { year: 2024, month: 1, day: 6, hour: 5, minute: 49 },
        affects: ['month'],
      },
    ])
  })

  it('시각을 모르면 벽시계 정오를 표준시로 바꿔 계산한다 (UTC+8:30 시기 1954-12-07 정오는 표준시 12:30)', () => {
    const saju = getSaju(birth(1954, 12, 7))
    expect(saju.pillars.day).toEqual(
      getDayPillar({ year: 1954, month: 12, day: 7, hour: 12, minute: 30 }),
    )
    // 대설은 표준시로 12월 8일 00:29(벽시계 12월 7일 23:59)이므로 12월 7일 정오는 아직 해월이다
    expect(saju.pillars.month.branch).toBe('해')
  })

  it('시각을 모를 때 절기 경고는 벽시계 날짜로 판정한다 (1954년 대설 표준시 12-08 00:29는 벽시계 12-07 23:59)', () => {
    const term = getSolarTerms(1954).find((candidate) => candidate.name === '대설')
    expect(term).toMatchObject({ month: 12, day: 8, hour: 0, minute: 29 })
    // 벽시계 12월 7일 23:59 출생은 대설 뒤이므로 12월 7일에 경고가 붙고, 12월 8일에는 붙지 않는다
    const seventh = getSaju(birth(1954, 12, 7)).warnings
    expect(seventh).toEqual([
      {
        type: 'solar-term-on-day',
        term: '대설',
        time: { year: 1954, month: 12, day: 8, hour: 0, minute: 29 },
        affects: ['month'],
      },
    ])
    expect(getSaju(birth(1954, 12, 8)).warnings).toEqual([])
    expect(getSaju(birth(1954, 12, 6)).warnings).toEqual([])
  })

  it('정오 부근에 12절이 있는 날은 벽시계 정오를 표준시로 바꿔야 월주가 맞다 (1908~1961년, 1987~1988년)', () => {
    let discriminating = 0
    for (const termYear of [
      1908, 1909, 1910, 1911, 1948, 1949, 1950, 1951, 1954, 1955, 1956, 1957, 1958, 1959, 1960,
      1961, 1987, 1988,
    ]) {
      for (const term of getSolarTerms(termYear)) {
        const minutes = term.hour * 60 + term.minute
        if (SOLAR_TERM_NAMES.indexOf(term.name) % 2 !== 0 || minutes < 11 * 60 || minutes > 13 * 60)
          continue
        const wallNoon: CivilDateTime = {
          year: term.year,
          month: term.month,
          day: term.day,
          hour: 12,
          minute: 0,
        }
        const standardNoon = toKoreaStandardTime(wallNoon).time
        const saju = getSaju(birth(term.year, term.month, term.day))
        expect(saju.pillars.month, `${termYear} ${term.name}`).toEqual(getMonthPillar(standardNoon))
        if (name(getMonthPillar(wallNoon)) !== name(getMonthPillar(standardNoon))) discriminating++
      }
    }
    // 벽시계 정오와 표준시 정오에서 월주가 실제로 달라지는 날이 있어야 이 검사가 의미가 있다
    expect(discriminating).toBeGreaterThanOrEqual(3)
  })

  it('시계가 00:00을 건너뛴 날에도 그날 하루를 구해서 판정한다 (1948-06-01 00:00~01:00은 없던 시각)', () => {
    expect(() => getSaju(birth(1948, 6, 1))).not.toThrow()
    expect(getSaju(birth(1948, 6, 1)).pillars.hour).toBeNull()
  })

  it('시각을 모를 때의 경고가 시각을 아는 경우와 맞는다 (1948~1961년, 1987~1988년 모든 12절)', () => {
    // 각 12절마다, 그 절기 시각 직후로 시각을 아는 벽시계 출생을 찾아 그 벽시계 날짜에 경고가 붙는지 본다.
    const dstYears = [
      1948, 1949, 1950, 1951, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1987, 1988,
    ]
    for (const termYear of dstYears) {
      for (const term of getSolarTerms(termYear)) {
        if (SOLAR_TERM_NAMES.indexOf(term.name) % 2 !== 0) continue
        // 절기 날짜 앞뒤 하루씩 벽시계 날짜 후보를 모두 살핀다
        const dates = [-1, 0, 1].map(
          (offset) => new Date(Date.UTC(term.year, term.month - 1, term.day + offset)),
        )
        const expectedDays = dates.filter((date) => {
          const [year, month, day] = [
            date.getUTCFullYear(),
            date.getUTCMonth() + 1,
            date.getUTCDate(),
          ]
          // 그날의 벽시계 분 중 표준시가 절기 시각과 같은 분이 있는지
          for (let minutes = 0; minutes < 24 * 60; minutes++) {
            for (const ambiguous of ['earlier', 'later'] as const) {
              try {
                const standard = toKoreaStandardTime(
                  { year, month, day, hour: Math.floor(minutes / 60), minute: minutes % 60 },
                  { ambiguous },
                ).time
                if (
                  standard.year === term.year &&
                  standard.month === term.month &&
                  standard.day === term.day &&
                  standard.hour === term.hour &&
                  standard.minute === term.minute
                ) {
                  return true
                }
              } catch {
                // 시계가 건너뛴 시각은 없던 시각이다
              }
            }
          }
          return false
        })
        expect(expectedDays.length, `${termYear} ${term.name}`).toBeGreaterThan(0)
        for (const date of dates) {
          const warned = getSaju(
            birth(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
          ).warnings.some(
            (warning) => warning.type === 'solar-term-on-day' && warning.term === term.name,
          )
          expect(warned, `${termYear} ${term.name} ${date.toISOString().slice(0, 10)}`).toBe(
            expectedDays.includes(date),
          )
        }
      }
    }
  })

  it('시각을 모르는 날에 중기만 있으면 경고하지 않는다 (2024-02-19 우수)', () => {
    expect(getSaju(birth(2024, 2, 19)).warnings).toEqual([])
  })
})

describe('getSaju: 자시와 옵션', () => {
  it('23:00~24:00(야자시)이면 경고하고, 일주는 옵션에 따라 다르다', () => {
    const midnight = getSaju(birth(2024, 2, 4, 23, 30))
    const eleven = getSaju(birth(2024, 2, 4, 23, 30), { dayChangeAt: '23:00' })
    expect(midnight.warnings).toEqual([{ type: 'night-zi', dayChangeAt: '00:00' }])
    expect(eleven.warnings).toEqual([{ type: 'night-zi', dayChangeAt: '23:00' }])
    expect(name(midnight.pillars.day)).toBe('무술')
    expect(name(eleven.pillars.day)).toBe('기해')
    // 시주는 옵션과 상관없이 같다
    expect(midnight.pillars.hour).toEqual(eleven.pillars.hour)
  })

  it('22:59는 야자시가 아니다', () => {
    expect(getSaju(birth(2024, 2, 4, 22, 59)).warnings).toEqual([])
  })

  it('옵션이 없거나 null이거나 비어 있으면 기본값이다', () => {
    const base = getSaju(birth(2024, 2, 4, 23, 30))
    expect(getSaju(birth(2024, 2, 4, 23, 30), {})).toEqual(base)
    expect(getSaju(birth(2024, 2, 4, 23, 30), null as unknown as undefined)).toEqual(base)
  })

  it('시계가 되감겨 같은 시각이 두 번 있으면 경고하고 ambiguousTime으로 고른다 (1948-09-12 23:30)', () => {
    const earlier = getSaju(birth(1948, 9, 12, 23, 30))
    const later = getSaju(birth(1948, 9, 12, 23, 30), { ambiguousTime: 'later' })
    expect(earlier.warnings).toContainEqual({ type: 'ambiguous-clock-time', chosen: 'earlier' })
    expect(later.warnings).toContainEqual({ type: 'ambiguous-clock-time', chosen: 'later' })
    expect(earlier.standardTime).toEqual({ year: 1948, month: 9, day: 12, hour: 22, minute: 30 })
    expect(later.standardTime).toEqual({ year: 1948, month: 9, day: 12, hour: 23, minute: 30 })
  })
})

describe('getSaju: 잘못된 입력', () => {
  it.each([
    ['hour만 줌', { year: 2024, month: 2, day: 4, hour: 12 }],
    ['minute만 줌', { year: 2024, month: 2, day: 4, minute: 30 }],
  ])('%s는 RangeError다', (_label, input) => {
    expect(() => getSaju(input)).toThrow(RangeError)
  })

  it.each([
    ['13월', birth(2024, 13, 1, 12, 0)],
    ['2월 30일', birth(2024, 2, 30, 12, 0)],
    ['24시', birth(2024, 2, 4, 24, 0)],
    ['60분', birth(2024, 2, 4, 12, 60)],
    ['소수 분', birth(2024, 2, 4, 12, 1.5)],
    ['NaN 연도', birth(Number.NaN, 2, 4, 12, 0)],
    ['시각 모름 13월', birth(2024, 13, 1)],
    ['시각 모름 평년 2월 29일', birth(2023, 2, 29)],
    ['지원 범위 앞', birth(1899, 12, 31, 12, 0)],
    ['지원 범위 뒤', birth(2151, 1, 1, 12, 0)],
    ['시각 모름 지원 범위 뒤', birth(2151, 1, 1)],
  ])('%s는 RangeError다', (_label, input) => {
    expect(() => getSaju(input)).toThrow(RangeError)
  })

  it('1900년 첫 소한 전은 월주를 구할 수 없어서 RangeError다', () => {
    expect(() => getSaju(birth(1900, 1, 1, 12, 0))).toThrow(RangeError)
  })

  it('2150년 마지막 날도 계산된다', () => {
    expect(getSaju(birth(2150, 12, 31, 12, 0)).pillars.month.branch).toBe('자')
  })

  it.each([
    ['dayChangeAt', { dayChangeAt: '24:00' }],
    ['ambiguousTime', { ambiguousTime: 'Later' }],
  ])('잘못된 %s 옵션은 RangeError다 (시각을 알든 모르든)', (_label, options) => {
    const bad = options as unknown as Parameters<typeof getSaju>[1]
    expect(() => getSaju(birth(2024, 2, 4, 12, 0), bad)).toThrow(RangeError)
    expect(() => getSaju(birth(2024, 2, 4), bad)).toThrow(RangeError)
  })
})

describe('getSaju: 시간대 변환과의 관계', () => {
  it('standardTime은 toKoreaStandardTime과 같다 (1955~1960년 서머타임 포함)', () => {
    for (const [y, m, d, h] of [
      [1955, 7, 1, 12],
      [1958, 8, 15, 9],
      [1960, 5, 10, 18],
      [1910, 6, 1, 12],
      [1905, 6, 1, 12],
    ] as const) {
      const wall: CivilDateTime = { year: y, month: m, day: d, hour: h, minute: 0 }
      expect(getSaju({ ...wall }).standardTime).toEqual(toKoreaStandardTime(wall).time)
    }
  })
})
