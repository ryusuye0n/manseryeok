import { describe, expect, it } from 'vitest'
import { type CivilDateTime, getDayPillar, getHourPillar } from '../src/index'

const at = (year: number, month: number, day: number, hour = 12, minute = 0): CivilDateTime => ({
  year,
  month,
  day,
  hour,
  minute,
})

const hour = (time: CivilDateTime): string => {
  const pillar = getHourPillar(time)
  return `${pillar.stem}${pillar.branch}`
}

// 하루 안에서 보는 시각: 0:00, 12:00, 그리고 홀수 시 정각(시진 시작)과 그 1분 전
const TIMES: readonly (readonly [number, number])[] = [
  [0, 0],
  [12, 0],
  ...Array.from({ length: 12 }, (_value, index) => 2 * index + 1).flatMap((h) => [
    [h, 0] as const,
    [h - 1, 59] as const,
  ]),
]

// 외부 라이브러리(lunar-javascript 1.7.8)가 계산한 시주다. 1900-01-01부터 2150-12-31 사이 91,676일 전부를
// 날마다 26개 시각(위 TIMES)으로 비교해서 2,383,576개 불일치 0개를 확인했고,
// 이 표본은 2,503일 간격으로 고른 37일이다. 각 행의 문자열은 TIMES 순서대로 이어 붙인 시주다.
const SAMPLES: readonly (readonly [number, number, number, string])[] = [
  [
    1900,
    1,
    1,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    1906,
    11,
    9,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
  [
    1913,
    9,
    16,
    '병자임오정축병자무인정축기묘무인경진기묘신사경진임오신사계미임오갑신계미을유갑신병술을유정해병술무자정해',
  ],
  [
    1920,
    7,
    24,
    '임자무오계축임자갑인계축을묘갑인병진을묘정사병진무오정사기미무오경신기미신유경신임술신유계해임술갑자계해',
  ],
  [
    1927,
    6,
    1,
    '무자갑오기축무자경인기축신묘경인임진신묘계사임진갑오계사을미갑오병신을미정유병신무술정유기해무술경자기해',
  ],
  [
    1934,
    4,
    8,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    1941,
    2,
    13,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
  [
    1947,
    12,
    22,
    '병자임오정축병자무인정축기묘무인경진기묘신사경진임오신사계미임오갑신계미을유갑신병술을유정해병술무자정해',
  ],
  [
    1954,
    10,
    29,
    '임자무오계축임자갑인계축을묘갑인병진을묘정사병진무오정사기미무오경신기미신유경신임술신유계해임술갑자계해',
  ],
  [
    1961,
    9,
    5,
    '무자갑오기축무자경인기축신묘경인임진신묘계사임진갑오계사을미갑오병신을미정유병신무술정유기해무술경자기해',
  ],
  [
    1968,
    7,
    13,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    1975,
    5,
    21,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
  [
    1982,
    3,
    28,
    '병자임오정축병자무인정축기묘무인경진기묘신사경진임오신사계미임오갑신계미을유갑신병술을유정해병술무자정해',
  ],
  [
    1989,
    2,
    2,
    '임자무오계축임자갑인계축을묘갑인병진을묘정사병진무오정사기미무오경신기미신유경신임술신유계해임술갑자계해',
  ],
  [
    1995,
    12,
    11,
    '무자갑오기축무자경인기축신묘경인임진신묘계사임진갑오계사을미갑오병신을미정유병신무술정유기해무술경자기해',
  ],
  [
    2002,
    10,
    18,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    2009,
    8,
    25,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
  [
    2016,
    7,
    2,
    '병자임오정축병자무인정축기묘무인경진기묘신사경진임오신사계미임오갑신계미을유갑신병술을유정해병술무자정해',
  ],
  [
    2023,
    5,
    10,
    '임자무오계축임자갑인계축을묘갑인병진을묘정사병진무오정사기미무오경신기미신유경신임술신유계해임술갑자계해',
  ],
  [
    2030,
    3,
    17,
    '무자갑오기축무자경인기축신묘경인임진신묘계사임진갑오계사을미갑오병신을미정유병신무술정유기해무술경자기해',
  ],
  [
    2037,
    1,
    22,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    2043,
    11,
    30,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
  [
    2050,
    10,
    7,
    '병자임오정축병자무인정축기묘무인경진기묘신사경진임오신사계미임오갑신계미을유갑신병술을유정해병술무자정해',
  ],
  [
    2057,
    8,
    14,
    '임자무오계축임자갑인계축을묘갑인병진을묘정사병진무오정사기미무오경신기미신유경신임술신유계해임술갑자계해',
  ],
  [
    2064,
    6,
    21,
    '무자갑오기축무자경인기축신묘경인임진신묘계사임진갑오계사을미갑오병신을미정유병신무술정유기해무술경자기해',
  ],
  [
    2071,
    4,
    29,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    2078,
    3,
    6,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
  [
    2085,
    1,
    11,
    '병자임오정축병자무인정축기묘무인경진기묘신사경진임오신사계미임오갑신계미을유갑신병술을유정해병술무자정해',
  ],
  [
    2091,
    11,
    19,
    '임자무오계축임자갑인계축을묘갑인병진을묘정사병진무오정사기미무오경신기미신유경신임술신유계해임술갑자계해',
  ],
  [
    2098,
    9,
    26,
    '무자갑오기축무자경인기축신묘경인임진신묘계사임진갑오계사을미갑오병신을미정유병신무술정유기해무술경자기해',
  ],
  [
    2105,
    8,
    4,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    2112,
    6,
    11,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
  [
    2119,
    4,
    19,
    '병자임오정축병자무인정축기묘무인경진기묘신사경진임오신사계미임오갑신계미을유갑신병술을유정해병술무자정해',
  ],
  [
    2126,
    2,
    24,
    '임자무오계축임자갑인계축을묘갑인병진을묘정사병진무오정사기미무오경신기미신유경신임술신유계해임술갑자계해',
  ],
  [
    2133,
    1,
    1,
    '무자갑오기축무자경인기축신묘경인임진신묘계사임진갑오계사을미갑오병신을미정유병신무술정유기해무술경자기해',
  ],
  [
    2139,
    11,
    9,
    '갑자경오을축갑자병인을축정묘병인무진정묘기사무진경오기사신미경오임신신미계유임신갑술계유을해갑술병자을해',
  ],
  [
    2146,
    9,
    16,
    '경자병오신축경자임인신축계묘임인갑진계묘을사갑진병오을사정미병오무신정미기유무신경술기유신해경술임자신해',
  ],
]

// 1월 중 일간이 주어진 천간 번호(0=갑)인 날을 찾는다
const dayWithStem = (stem: number): CivilDateTime => {
  for (let day = 1; day <= 12; day++) {
    if (getDayPillar(at(2024, 1, day)).index % 10 === stem) return at(2024, 1, day)
  }
  throw new Error(`일간 ${stem}인 날이 없다`)
}

const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']

describe('getHourPillar: 알려진 시각', () => {
  it.each(SAMPLES)('%i-%i-%i의 시주들이 독립 계산과 같다', (year, month, day, expected) => {
    const actual = TIMES.map(([h, m]) => hour(at(year, month, day, h, m))).join('')
    expect(actual).toBe(expected)
  })

  it('갑일의 12시진은 갑자부터 을해까지다', () => {
    // 갑일의 자시는 갑자시이고 시진마다 천간이 하나씩 간다
    const day = dayWithStem(0)
    const expected = BRANCHES.map((branch, index) => `${STEMS[index % 10]}${branch}`)
    const actual = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) =>
      hour(at(day.year, day.month, day.day, h, 30)),
    )
    expect(actual).toEqual(expected)
  })
})

describe('getHourPillar: 시지(12시진)', () => {
  it('2시간마다 바뀌고 자시는 23:00부터다', () => {
    const day = at(2024, 3, 10)
    const branchAt = (h: number, m: number): string =>
      getHourPillar(at(day.year, day.month, day.day, h, m)).branch
    expect(branchAt(22, 59)).toBe('해')
    expect(branchAt(23, 0)).toBe('자')
    expect(branchAt(23, 59)).toBe('자')
    expect(branchAt(0, 0)).toBe('자')
    expect(branchAt(0, 59)).toBe('자')
    expect(branchAt(1, 0)).toBe('축')
    expect(branchAt(2, 59)).toBe('축')
    expect(branchAt(3, 0)).toBe('인')
    expect(branchAt(10, 59)).toBe('사')
    expect(branchAt(11, 0)).toBe('오')
    expect(branchAt(12, 59)).toBe('오')
    expect(branchAt(13, 0)).toBe('미')
    expect(branchAt(21, 0)).toBe('해')
  })
})

describe('getHourPillar: 시간(오자둔)', () => {
  it.each([
    [0, '갑'],
    [1, '병'],
    [2, '무'],
    [3, '경'],
    [4, '임'],
    [5, '갑'],
    [6, '병'],
    [7, '무'],
    [8, '경'],
    [9, '임'],
  ])('일간이 %i번째 천간인 날의 자시는 %s자시다', (dayStem, expectedStem) => {
    const day = dayWithStem(dayStem)
    expect(hour(at(day.year, day.month, day.day, 0, 30))).toBe(`${expectedStem}자`)
  })

  it('23:00부터는 야자시라서 시간을 다음 날 일간으로 정한다', () => {
    const day = dayWithStem(0)
    const next = at(day.year, day.month, day.day + 1)
    // 갑일 23:30의 시주는 을일의 자시(병자)다. 같은 날 00:30은 갑자다.
    expect(hour(at(day.year, day.month, day.day, 0, 30))).toBe('갑자')
    expect(hour(at(day.year, day.month, day.day, 23, 30))).toBe('병자')
    expect(hour(at(next.year, next.month, next.day, 0, 30))).toBe('병자')
  })

  it('야자시(23:00~24:00)와 다음 날 조자시(00:00~01:00)의 시주가 같다 (1900~2150년 전체)', () => {
    for (let time = Date.UTC(1900, 0, 1); time < Date.UTC(2150, 11, 31); time += 86_400_000) {
      const today = new Date(time)
      const tomorrow = new Date(time + 86_400_000)
      const night = hour(
        at(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate(), 23, 30),
      )
      const early = hour(
        at(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), 0, 30),
      )
      if (night !== early)
        throw new Error(`${today.toISOString()}에서 ${night}와 ${early}가 다르다`)
    }
  })

  it('지원 범위의 마지막 날(2150-12-31) 23:30도 계산된다 (다음 날은 범위 밖이어도 일간만 쓴다)', () => {
    const lastDay = getDayPillar(at(2150, 12, 31)).index
    const nextStem = (lastDay + 1) % 10
    expect(getHourPillar(at(2150, 12, 31, 23, 30))).toMatchObject({
      stem: STEMS[((nextStem % 5) * 2) % 10],
      branch: '자',
    })
  })
})

describe('getHourPillar: 잘못된 입력', () => {
  it('지원 범위는 1900~2150년이다', () => {
    expect(() => getHourPillar(at(1899, 12, 31, 23, 59))).toThrow(RangeError)
    expect(() => getHourPillar(at(2151, 1, 1, 0, 0))).toThrow('1900~2150')
    expect(hour(at(1900, 1, 1, 0, 0))).toMatch(/^.자$/)
  })

  it.each([
    ['13월', at(2024, 13, 1)],
    ['2월 30일', at(2024, 2, 30)],
    ['24시', at(2024, 2, 4, 24, 0)],
    ['60분', at(2024, 2, 4, 12, 60)],
    ['NaN 연도', at(Number.NaN, 2, 4)],
  ])('%s는 RangeError를 낸다', (_label, time) => {
    expect(() => getHourPillar(time)).toThrow(RangeError)
  })
})
