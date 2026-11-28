import { describe, expect, it } from 'vitest'
import {
  type BirthInput,
  type CivilDateTime,
  type Gender,
  getMajorLuck,
  getSaju,
  type MajorLuck,
} from '../src/index'
import { addAge } from '../src/major-luck'
import { getJieTerms } from '../src/solar-terms'

const birth = (
  year: number,
  month: number,
  day: number,
  hour?: number,
  minute?: number,
): BirthInput =>
  hour === undefined ? { year, month, day } : { year, month, day, hour, minute: minute ?? 0 }

const names = (luck: MajorLuck, count = luck.periods.length): string =>
  luck.periods
    .slice(0, count)
    .map((period) => `${period.pillar.stem}${period.pillar.branch}`)
    .join(' ')

const ageDays = (age: { years: number; months: number; days: number; hours: number }): number =>
  age.years * 360 + age.months * 30 + age.days + age.hours / 24

const dayNumber = (date: { year: number; month: number; day: number }): number =>
  Date.UTC(date.year, date.month - 1, date.day) / 86_400_000

// 독립 계산 표본: Node의 시간대 데이터(Asia/Seoul)로 벽시계 시각을 만들고, 같은 순간의 표준시를
// 외부 라이브러리(lunar-javascript 1.7.8)에 넣어 대운을 얻었다. 라이브러리가 절기를 베이징 시각으로 보므로
// 절기 계산에는 표준시에서 1시간을 뺀 시각을 넣었다.
// (벽시계 연, 월, 일, 시, 분, 성별, 순행 여부, 대운 간지 9개, 시작 나이 년, 월, 일, 시, 시작 날짜 년, 월, 일)
// 이 8,000개 표본을 같은 방법으로 비교해서 방향과 간지는 불일치 0개, 시작 나이는 최대 1분(나이로 2시간) 차이를 확인했다.
// 절기 시각 바로 앞뒤(경계 경고가 붙는 출생)는 라이브러리와 분 단위 차이가 있어서 비교에서 뺐다.
const SAMPLES: [
  number,
  number,
  number,
  number,
  number,
  'm' | 'f',
  boolean,
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
][] = [
  [
    1962,
    10,
    18,
    12,
    31,
    'f',
    false,
    '기유 무신 정미 병오 을사 갑진 계묘 임인 신축',
    3,
    1,
    14,
    12,
    1965,
    12,
    2,
  ],
  [
    2036,
    3,
    31,
    21,
    8,
    'f',
    false,
    '경인 기축 무자 정해 병술 을유 갑신 계미 임오',
    8,
    9,
    29,
    18,
    2045,
    1,
    30,
  ],
  [
    1995,
    12,
    14,
    21,
    11,
    'm',
    false,
    '정해 병술 을유 갑신 계미 임오 신사 경진 기묘',
    2,
    3,
    19,
    2,
    1998,
    4,
    2,
  ],
  [
    2029,
    11,
    23,
    8,
    58,
    'm',
    false,
    '갑술 계유 임신 신미 경오 기사 무진 정묘 병인',
    5,
    3,
    13,
    12,
    2035,
    3,
    8,
  ],
  [
    1979,
    10,
    18,
    10,
    42,
    'f',
    true,
    '을해 병자 정축 무인 기묘 경진 신사 임오 계미',
    6,
    11,
    24,
    4,
    1986,
    10,
    12,
  ],
  [
    2053,
    6,
    2,
    12,
    30,
    'm',
    false,
    '병진 을묘 갑인 계축 임자 신해 경술 기유 무신',
    9,
    4,
    14,
    18,
    2062,
    10,
    17,
  ],
  [
    2081,
    2,
    19,
    23,
    16,
    'f',
    true,
    '신묘 임진 계사 갑오 을미 병신 정유 무술 기해',
    4,
    5,
    8,
    20,
    2085,
    7,
    28,
  ],
  [
    2001,
    12,
    19,
    15,
    40,
    'f',
    true,
    '신축 임인 계묘 갑진 을사 병오 정미 무신 기유',
    5,
    9,
    0,
    6,
    2007,
    9,
    19,
  ],
  [
    2082,
    5,
    19,
    7,
    49,
    'f',
    false,
    '갑진 계묘 임인 신축 경자 기해 무술 정유 병신',
    4,
    7,
    20,
    14,
    2087,
    1,
    8,
  ],
  [
    2003,
    7,
    20,
    8,
    42,
    'm',
    false,
    '무오 정사 병진 을묘 갑인 계축 임자 신해 경술',
    4,
    1,
    25,
    14,
    2007,
    9,
    14,
  ],
  [
    2081,
    7,
    7,
    1,
    32,
    'f',
    true,
    '병신 정유 무술 기해 경자 신축 임인 계묘 갑진',
    10,
    4,
    10,
    10,
    2091,
    11,
    17,
  ],
  [
    2070,
    6,
    29,
    1,
    15,
    'm',
    true,
    '계미 갑신 을유 병술 정해 무자 기축 경인 신묘',
    2,
    8,
    3,
    2,
    2073,
    3,
    3,
  ],
  [
    2084,
    3,
    4,
    0,
    7,
    'm',
    true,
    '정묘 무진 기사 경오 신미 임신 계유 갑술 을해',
    0,
    4,
    1,
    12,
    2084,
    7,
    5,
  ],
  [
    2032,
    8,
    14,
    14,
    58,
    'm',
    true,
    '기유 경술 신해 임자 계축 갑인 을묘 병진 정사',
    7,
    11,
    8,
    6,
    2040,
    7,
    22,
  ],
  [
    2035,
    4,
    26,
    21,
    20,
    'm',
    false,
    '기묘 무인 정축 병자 을해 갑술 계유 임신 신미',
    7,
    2,
    7,
    6,
    2042,
    7,
    4,
  ],
  [
    2080,
    9,
    11,
    23,
    28,
    'f',
    false,
    '갑신 계미 임오 신사 경진 기묘 무인 정축 병자',
    1,
    7,
    20,
    12,
    2082,
    5,
    2,
  ],
  [
    2050,
    10,
    9,
    15,
    55,
    'm',
    true,
    '정해 무자 기축 경인 신묘 임진 계사 갑오 을미',
    9,
    7,
    23,
    4,
    2060,
    6,
    1,
  ],
  [
    1926,
    10,
    13,
    5,
    18,
    'm',
    true,
    '기해 경자 신축 임인 계묘 갑진 을사 병오 정미',
    8,
    9,
    9,
    2,
    1935,
    7,
    22,
  ],
  [
    1974,
    5,
    29,
    21,
    51,
    'f',
    false,
    '무진 정묘 병인 을축 갑자 계해 임술 신유 경신',
    7,
    10,
    16,
    12,
    1982,
    4,
    15,
  ],
  [
    2087,
    10,
    9,
    19,
    50,
    'm',
    false,
    '기유 무신 정미 병오 을사 갑진 계묘 임인 신축',
    0,
    5,
    19,
    10,
    2088,
    3,
    29,
  ],
  [
    2037,
    2,
    25,
    11,
    32,
    'f',
    true,
    '계묘 갑진 을사 병오 정미 무신 기유 경술 신해',
    2,
    8,
    17,
    20,
    2039,
    11,
    12,
  ],
  [
    1949,
    7,
    22,
    21,
    22,
    'm',
    false,
    '경오 기사 무진 정묘 병인 을축 갑자 계해 임술',
    4,
    11,
    29,
    6,
    1954,
    7,
    22,
  ],
  [
    1917,
    11,
    30,
    18,
    1,
    'm',
    false,
    '경술 기유 무신 정미 병오 을사 갑진 계묘 임인',
    7,
    5,
    17,
    2,
    1925,
    5,
    17,
  ],
  [
    2079,
    5,
    19,
    10,
    48,
    'f',
    true,
    '경오 신미 임신 계유 갑술 을해 병자 정축 무인',
    5,
    9,
    16,
    10,
    2085,
    3,
    7,
  ],
  [
    1984,
    11,
    4,
    4,
    12,
    'm',
    true,
    '을해 병자 정축 무인 기묘 경진 신사 임오 계미',
    1,
    1,
    22,
    18,
    1985,
    12,
    26,
  ],
  [
    1985,
    1,
    10,
    2,
    50,
    'm',
    true,
    '무인 기묘 경진 신사 임오 계미 갑신 을유 병술',
    8,
    4,
    16,
    18,
    1993,
    5,
    26,
  ],
  [
    2002,
    1,
    3,
    0,
    35,
    'f',
    true,
    '신축 임인 계묘 갑진 을사 병오 정미 무신 기유',
    0,
    11,
    15,
    16,
    2002,
    12,
    18,
  ],
  [
    2116,
    10,
    21,
    5,
    1,
    'm',
    true,
    '기해 경자 신축 임인 계묘 갑진 을사 병오 정미',
    5,
    9,
    17,
    18,
    2122,
    8,
    7,
  ],
  [
    2009,
    7,
    31,
    6,
    4,
    'm',
    false,
    '경오 기사 무진 정묘 병인 을축 갑자 계해 임술',
    7,
    11,
    19,
    6,
    2017,
    7,
    19,
  ],
  [
    1941,
    2,
    21,
    10,
    22,
    'f',
    true,
    '신묘 임진 계사 갑오 을미 병신 정유 무술 기해',
    4,
    3,
    19,
    0,
    1945,
    6,
    9,
  ],
  [
    2015,
    4,
    1,
    13,
    10,
    'f',
    true,
    '경진 신사 임오 계미 갑신 을유 병술 정해 무자',
    1,
    3,
    22,
    10,
    2016,
    7,
    23,
  ],
  [
    1956,
    12,
    4,
    9,
    3,
    'f',
    false,
    '무술 정유 병신 을미 갑오 계사 임진 신묘 경인',
    8,
    10,
    10,
    16,
    1965,
    10,
    15,
  ],
  [
    1935,
    5,
    21,
    18,
    13,
    'm',
    false,
    '경진 기묘 무인 정축 병자 을해 갑술 계유 임신',
    4,
    11,
    20,
    2,
    1940,
    5,
    11,
  ],
  [
    2082,
    10,
    13,
    22,
    31,
    'f',
    false,
    '기유 무신 정미 병오 을사 갑진 계묘 임인 신축',
    1,
    10,
    27,
    20,
    2084,
    9,
    10,
  ],
  [
    1942,
    2,
    24,
    12,
    17,
    'f',
    false,
    '신축 경자 기해 무술 정유 병신 을미 갑오 계사',
    6,
    6,
    22,
    10,
    1948,
    9,
    15,
  ],
  [
    1978,
    4,
    12,
    12,
    19,
    'm',
    true,
    '정사 무오 기미 경신 신유 임술 계해 갑자 을축',
    7,
    10,
    29,
    2,
    1986,
    3,
    13,
  ],
  [
    2085,
    9,
    8,
    7,
    32,
    'm',
    false,
    '갑신 계미 임오 신사 경진 기묘 무인 정축 병자',
    0,
    4,
    7,
    2,
    2086,
    1,
    15,
  ],
  [
    2116,
    12,
    21,
    8,
    3,
    'm',
    true,
    '신축 임인 계묘 갑진 을사 병오 정미 무신 기유',
    5,
    1,
    27,
    12,
    2122,
    2,
    17,
  ],
  [
    1995,
    6,
    21,
    4,
    3,
    'f',
    true,
    '계미 갑신 을유 병술 정해 무자 기축 경인 신묘',
    5,
    7,
    4,
    20,
    2001,
    1,
    25,
  ],
  [
    2001,
    4,
    7,
    18,
    51,
    'f',
    true,
    '계사 갑오 을미 병신 정유 무술 기해 경자 신축',
    9,
    4,
    4,
    10,
    2010,
    8,
    12,
  ],
  [
    2098,
    12,
    29,
    0,
    44,
    'f',
    false,
    '계해 임술 신유 경신 기미 무오 정사 병진 을묘',
    7,
    4,
    7,
    16,
    2106,
    5,
    6,
  ],
  [
    2089,
    7,
    30,
    22,
    20,
    'm',
    false,
    '경오 기사 무진 정묘 병인 을축 갑자 계해 임술',
    8,
    1,
    0,
    18,
    2097,
    8,
    31,
  ],
  [
    2076,
    7,
    9,
    9,
    16,
    'f',
    false,
    '갑오 계사 임진 신묘 경인 기축 무자 정해 병술',
    0,
    11,
    11,
    8,
    2077,
    6,
    20,
  ],
  [
    1945,
    7,
    23,
    14,
    30,
    'f',
    true,
    '갑신 을유 병술 정해 무자 기축 경인 신묘 임진',
    5,
    2,
    22,
    22,
    1950,
    10,
    16,
  ],
  [
    2017,
    10,
    30,
    16,
    58,
    'f',
    true,
    '신해 임자 계축 갑인 을묘 병진 정사 무오 기미',
    2,
    7,
    18,
    6,
    2020,
    6,
    17,
  ],
  [
    1925,
    6,
    21,
    14,
    43,
    'm',
    false,
    '신사 경진 기묘 무인 정축 병자 을해 갑술 계유',
    4,
    11,
    28,
    22,
    1930,
    6,
    19,
  ],
  [
    2049,
    6,
    24,
    3,
    21,
    'f',
    true,
    '신미 임신 계유 갑술 을해 병자 정축 무인 기묘',
    4,
    3,
    13,
    22,
    2053,
    10,
    8,
  ],
  [
    1964,
    6,
    11,
    6,
    35,
    'f',
    false,
    '기사 무진 정묘 병인 을축 갑자 계해 임술 신유',
    1,
    8,
    27,
    0,
    1966,
    3,
    10,
  ],
  [
    2081,
    5,
    31,
    19,
    48,
    'f',
    true,
    '갑오 을미 병신 정유 무술 기해 경자 신축 임인',
    1,
    5,
    29,
    10,
    2082,
    11,
    30,
  ],
  [
    1997,
    7,
    19,
    14,
    37,
    'm',
    false,
    '병오 을사 갑진 계묘 임인 신축 경자 기해 무술',
    4,
    0,
    19,
    0,
    2001,
    8,
    7,
  ],
  [
    1999,
    1,
    6,
    21,
    56,
    'f',
    false,
    '갑자 계해 임술 신유 경신 기미 무오 정사 병진',
    0,
    2,
    28,
    6,
    1999,
    4,
    4,
  ],
  [
    2037,
    1,
    21,
    7,
    19,
    'm',
    true,
    '임인 계묘 갑진 을사 병오 정미 무신 기유 경술',
    4,
    6,
    9,
    8,
    2041,
    7,
    30,
  ],
  [
    1960,
    2,
    3,
    6,
    54,
    'f',
    true,
    '무인 기묘 경진 신사 임오 계미 갑신 을유 병술',
    0,
    7,
    14,
    22,
    1960,
    9,
    18,
  ],
  [
    1984,
    2,
    2,
    19,
    50,
    'f',
    true,
    '병인 정묘 무진 기사 경오 신미 임신 계유 갑술',
    0,
    8,
    22,
    8,
    1984,
    10,
    25,
  ],
  [
    1994,
    4,
    29,
    4,
    40,
    'f',
    false,
    '정묘 병인 을축 갑자 계해 임술 신유 경신 기미',
    7,
    11,
    5,
    18,
    2002,
    4,
    3,
  ],
  [
    2119,
    5,
    17,
    18,
    48,
    'm',
    false,
    '무진 정묘 병인 을축 갑자 계해 임술 신유 경신',
    3,
    9,
    20,
    20,
    2123,
    3,
    10,
  ],
  [
    2062,
    7,
    16,
    19,
    24,
    'f',
    false,
    '병오 을사 갑진 계묘 임인 신축 경자 기해 무술',
    3,
    2,
    18,
    20,
    2065,
    10,
    5,
  ],
  [
    1914,
    12,
    22,
    12,
    0,
    'm',
    true,
    '정축 무인 기묘 경진 신사 임오 계미 갑신 을유',
    5,
    1,
    3,
    8,
    1920,
    1,
    25,
  ],
  [
    2058,
    4,
    15,
    5,
    37,
    'f',
    false,
    '을묘 갑인 계축 임자 신해 경술 기유 무신 정미',
    3,
    5,
    9,
    10,
    2061,
    9,
    24,
  ],
  [
    2030,
    2,
    19,
    7,
    1,
    'f',
    false,
    '정축 병자 을해 갑술 계유 임신 신미 경오 기사',
    5,
    0,
    14,
    10,
    2035,
    3,
    5,
  ],
  [
    1943,
    5,
    6,
    5,
    18,
    'f',
    true,
    '정사 무오 기미 경신 신유 임술 계해 갑자 을축',
    0,
    2,
    7,
    22,
    1943,
    7,
    14,
  ],
  [
    2076,
    6,
    26,
    10,
    4,
    'f',
    false,
    '계사 임진 신묘 경인 기축 무자 정해 병술 을유',
    7,
    1,
    5,
    20,
    2083,
    8,
    1,
  ],
  [
    1973,
    3,
    6,
    22,
    8,
    'm',
    false,
    '갑인 계축 임자 신해 경술 기유 무신 정미 병오',
    0,
    3,
    9,
    16,
    1973,
    6,
    16,
  ],
  [
    2014,
    5,
    7,
    2,
    39,
    'm',
    true,
    '경오 신미 임신 계유 갑술 을해 병자 정축 무인',
    10,
    0,
    2,
    0,
    2024,
    5,
    9,
  ],
]

describe('getMajorLuck: 독립 계산과 비교', () => {
  it.each(SAMPLES)(
    '%i-%i-%i %i:%i %s의 대운',
    (year, month, day, hour, minute, genderCode, forward, pillars, ay, am, ad, ah, sy, sm, sd) => {
      const gender: Gender = genderCode === 'm' ? 'male' : 'female'
      const luck = getMajorLuck(birth(year, month, day, hour, minute), gender)
      expect(luck.direction).toBe(forward ? 'forward' : 'backward')
      expect(names(luck, 9)).toBe(pillars)
      // 시작 나이는 절기 시각이 분 단위로 반올림되어 있어서 1분(나이로 2시간 = 0.1일 이하) 안에서 같다
      expect(
        Math.abs(ageDays(luck.startAge) - (ay * 360 + am * 30 + ad + ah / 24)),
      ).toBeLessThanOrEqual(0.1)
      // 시작 날짜는 달력으로 더하는 방식 차이로 2일 안에서 같다
      const start = luck.periods[0]?.startDate
      if (start === undefined) throw new Error('대운이 비어 있다')
      expect(
        Math.abs(dayNumber(start) - dayNumber({ year: sy, month: sm, day: sd })),
      ).toBeLessThanOrEqual(2)
    },
  )
})

describe('getMajorLuck: 방향', () => {
  it('연간이 양(갑 병 무 경 임)인 남자와 음(을 정 기 신 계)인 여자는 순행이다', () => {
    // 2024년은 갑진년(양), 2023년은 계묘년(음). 6월은 입춘 뒤라 해가 확정이다.
    expect(getMajorLuck(birth(2024, 6, 15, 12, 0), 'male').direction).toBe('forward')
    expect(getMajorLuck(birth(2024, 6, 15, 12, 0), 'female').direction).toBe('backward')
    expect(getMajorLuck(birth(2023, 6, 15, 12, 0), 'male').direction).toBe('backward')
    expect(getMajorLuck(birth(2023, 6, 15, 12, 0), 'female').direction).toBe('forward')
  })

  it('입춘 전에 태어나면 전해의 음양으로 정한다 (2024-01-20은 아직 계묘년)', () => {
    expect(getMajorLuck(birth(2024, 1, 20, 12, 0), 'male').direction).toBe('backward')
    expect(getMajorLuck(birth(2024, 2, 4, 17, 26), 'male').direction).toBe('backward')
    expect(getMajorLuck(birth(2024, 2, 4, 17, 28), 'male').direction).toBe('forward')
  })

  it('순행은 월주에서 60갑자 순서를 하나씩 늘리고 역행은 하나씩 줄인다', () => {
    const forward = getMajorLuck(birth(2024, 6, 15, 12, 0), 'male')
    const backward = getMajorLuck(birth(2024, 6, 15, 12, 0), 'female')
    const month = getSaju(birth(2024, 6, 15, 12, 0)).pillars.month.index
    forward.periods.forEach((period, index) => {
      expect(period.pillar.index).toBe((month + index + 1) % 60)
    })
    backward.periods.forEach((period, index) => {
      expect(period.pillar.index).toBe((((month - index - 1) % 60) + 60) % 60)
    })
  })

  it('갑진년 오월(경오월) 남자의 대운은 신미, 임신, 계유 ... 순서다', () => {
    expect(names(getMajorLuck(birth(2024, 6, 15, 12, 0), 'male'), 3)).toBe('신미 임신 계유')
    expect(names(getMajorLuck(birth(2024, 6, 15, 12, 0), 'female'), 3)).toBe('기사 무진 정묘')
  })
})

describe('getMajorLuck: 시작 나이 환산 (3일 = 1년)', () => {
  // 2024년 경칩(표 값)을 기준으로 정확한 간격만큼 앞의 시각에 태어난 갑진년 남자(순행)를 만든다
  const jie = getJieTerms(2024)
  const gyeongchip = jie.find((term) => term.name === '경칩')
  if (gyeongchip === undefined) throw new Error('경칩이 없다')
  const before = (minutes: number): BirthInput => {
    const date = new Date(
      Date.UTC(
        2024,
        gyeongchip.month - 1,
        gyeongchip.day,
        gyeongchip.hour,
        gyeongchip.minute - minutes,
      ),
    )
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    }
  }

  it.each([
    ['3일 = 1년', 3 * 24 * 60, { years: 1, months: 0, days: 0, hours: 0 }],
    ['6시간 = 1개월', 6 * 60, { years: 0, months: 1, days: 0, hours: 0 }],
    ['12분 = 1일', 12, { years: 0, months: 0, days: 1, hours: 0 }],
    ['1분 = 2시간', 1, { years: 0, months: 0, days: 0, hours: 2 }],
    ['9일 7시간 30분', 9 * 24 * 60 + 7 * 60 + 30, { years: 3, months: 1, days: 7, hours: 12 }],
    ['29일', 29 * 24 * 60, { years: 9, months: 8, days: 0, hours: 0 }],
  ])('절기 %s 앞이면 시작 나이는 %j이다', (_label, minutes, expected) => {
    expect(getMajorLuck(before(minutes), 'male').startAge).toEqual(expected)
  })

  it('역행은 직전 절기부터 지난 시간으로 정한다 (입춘 뒤 3일은 1년)', () => {
    const lichun = jie.find((term) => term.name === '입춘')
    if (lichun === undefined) throw new Error('입춘이 없다')
    const date = new Date(
      Date.UTC(2024, lichun.month - 1, lichun.day, lichun.hour, lichun.minute + 3 * 24 * 60),
    )
    const luck = getMajorLuck(
      {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: date.getUTCHours(),
        minute: date.getUTCMinutes(),
      },
      'female',
    )
    expect(luck.direction).toBe('backward')
    expect(luck.startAge).toEqual({ years: 1, months: 0, days: 0, hours: 0 })
  })

  it('절기 시각 정각에 태어난 역행은 시작 나이가 0이고 경계 경고가 붙는다', () => {
    const lichun = jie.find((term) => term.name === '입춘')
    if (lichun === undefined) throw new Error('입춘이 없다')
    const luck = getMajorLuck(
      birth(2024, lichun.month, lichun.day, lichun.hour, lichun.minute),
      'female',
    )
    expect(luck.startAge).toEqual({ years: 0, months: 0, days: 0, hours: 0 })
    expect(luck.warnings.some((warning) => warning.type === 'solar-term-near')).toBe(true)
  })

  it('시작 나이가 달 안의 값을 넘지 않는다 (순행은 다음 절까지 한 달 안, 대운수는 최대 10세 안팎)', () => {
    for (let day = 1; day <= 28; day++) {
      for (const gender of ['male', 'female'] as const) {
        const { startAge } = getMajorLuck(birth(2024, 5, day, 12, 0), gender)
        expect(startAge.years).toBeLessThanOrEqual(10)
        expect(startAge.months).toBeLessThanOrEqual(11)
        expect(startAge.days).toBeLessThanOrEqual(29)
        expect(startAge.hours).toBeLessThanOrEqual(23)
      }
    }
  })
})

describe('getMajorLuck: 대운 목록', () => {
  const luck = getMajorLuck(birth(1990, 6, 15, 10, 30), 'male')

  it('기본은 10개이고 시작 나이가 10년씩 늘어난다', () => {
    expect(luck.periods).toHaveLength(10)
    luck.periods.forEach((period, index) => {
      expect(period.startAge).toEqual({ ...luck.startAge, years: luck.startAge.years + 10 * index })
    })
  })

  it('시작 날짜는 출생 날짜에 시작 나이를 더한 값이고 10년씩 늘어난다', () => {
    luck.periods.forEach((period, index) => {
      if (index === 0) return
      const previous = luck.periods[index - 1]
      expect(period.startDate.year - (previous?.startDate.year ?? 0)).toBe(10)
    })
  })

  it('세는 나이는 시작하는 해에서 출생 연도를 뺀 값에 1을 더한다', () => {
    luck.periods.forEach((period) => {
      expect(period.koreanAge).toBe(period.startDate.year - 1990 + 1)
    })
  })

  it('count로 개수를 정한다 (1~12)', () => {
    expect(getMajorLuck(birth(1990, 6, 15, 10, 30), 'male', { count: 1 }).periods).toHaveLength(1)
    expect(getMajorLuck(birth(1990, 6, 15, 10, 30), 'male', { count: 12 }).periods).toHaveLength(12)
  })

  it.each([0, 13, 1.5, -1, Number.NaN, '3'])('count가 %j이면 RangeError다', (count) => {
    expect(() =>
      getMajorLuck(birth(1990, 6, 15, 10, 30), 'male', { count } as unknown as { count: number }),
    ).toThrow(RangeError)
  })
})

describe('getMajorLuck: 시각을 모르는 경우', () => {
  it('정오로 계산하고 시작 나이가 어긋날 수 있다고 알린다', () => {
    const unknown = getMajorLuck(birth(1990, 6, 15), 'male')
    const noon = getMajorLuck(birth(1990, 6, 15, 12, 0), 'male')
    expect(unknown.periods).toEqual(noon.periods)
    expect(unknown.startAge).toEqual(noon.startAge)
    expect(unknown.warnings).toContainEqual({ type: 'start-age-approximate', maxErrorMonths: 2 })
    expect(noon.warnings.some((warning) => warning.type === 'start-age-approximate')).toBe(false)
  })

  it('사주 8자의 경고도 함께 돌려준다 (시각을 모르는데 그날 입춘이 있으면)', () => {
    const luck = getMajorLuck(birth(2024, 2, 4), 'male')
    expect(luck.warnings.some((warning) => warning.type === 'solar-term-on-day')).toBe(true)
  })
})

describe('getMajorLuck: 옵션과 서비스 입력', () => {
  it('벽시계 시각을 표준시로 바꿔서 계산한다 (1988-07-07 06:40 서머타임은 표준시 05:40, 소서 06:33 전)', () => {
    // 표준시 05:40은 소서(06:33) 53분 전이라 아직 오월이고, 무진년(양) 남자는 순행이어서 소서까지 53분 = 4일 10시간이다.
    // 벽시계 06:40을 그대로 썼다면 소서 뒤(미월)가 되어 다음 절기까지 한 달가량이 걸린다.
    const luck = getMajorLuck(birth(1988, 7, 7, 6, 40), 'male')
    expect(luck.direction).toBe('forward')
    expect(luck.startAge).toEqual({ years: 0, months: 0, days: 4, hours: 10 })
    expect(luck.periods[0]?.pillar.branch).toBe('미')
  })

  it('dayChangeAt과 ambiguousTime 옵션을 8자 계산에 넘긴다', () => {
    expect(() =>
      getMajorLuck(birth(2024, 2, 4, 12, 0), 'male', { dayChangeAt: '24:00' as '00:00' }),
    ).toThrow(RangeError)
    expect(() =>
      getMajorLuck(birth(2024, 2, 4, 12, 0), 'male', { ambiguousTime: 'Later' as 'later' }),
    ).toThrow(RangeError)
  })

  it('옵션이 없거나 null이거나 비어 있으면 기본값이다', () => {
    const base = getMajorLuck(birth(1990, 6, 15, 10, 30), 'male')
    expect(getMajorLuck(birth(1990, 6, 15, 10, 30), 'male', {})).toEqual(base)
    expect(getMajorLuck(birth(1990, 6, 15, 10, 30), 'male', null as unknown as undefined)).toEqual(
      base,
    )
  })

  it.each(['남', 'M', '', null, undefined, 1])('gender가 %j이면 RangeError다', (gender) => {
    expect(() => getMajorLuck(birth(1990, 6, 15, 10, 30), gender as unknown as Gender)).toThrow(
      RangeError,
    )
  })

  it('잘못된 출생 입력은 RangeError다', () => {
    expect(() => getMajorLuck(birth(2024, 2, 30, 12, 0), 'male')).toThrow(RangeError)
    expect(() => getMajorLuck({ year: 2024, month: 2, day: 4, hour: 12 }, 'male')).toThrow(
      RangeError,
    )
  })
})

describe('getMajorLuck: 지원 범위의 끝', () => {
  it('1900년 첫 소한 전에는 역행의 직전 절기가 없어서 RangeError다', () => {
    expect(() => getMajorLuck(birth(1900, 1, 3, 12, 0), 'male')).toThrow(RangeError)
  })

  it('2150년 12월 말 순행은 다음 절기를 몰라서 RangeError이고 역행은 계산된다', () => {
    // 2150년은 경술년(양)이라 남자가 순행, 여자가 역행이다
    expect(() => getMajorLuck(birth(2150, 12, 28, 12, 0), 'male')).toThrow(RangeError)
    expect(getMajorLuck(birth(2150, 12, 28, 12, 0), 'female').direction).toBe('backward')
  })
})

describe('addAge: 출생 날짜에 나이를 달력으로 더한다', () => {
  const birthAt = (year: number, month: number, day: number, hour = 0): CivilDateTime => ({
    year,
    month,
    day,
    hour,
    minute: 0,
  })

  it('년과 월을 더하고 없는 날짜는 그달 말일로 맞춘다', () => {
    expect(addAge(birthAt(2024, 1, 31), { years: 0, months: 1, days: 0, hours: 0 })).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    })
    expect(addAge(birthAt(2023, 1, 31), { years: 0, months: 1, days: 0, hours: 0 })).toEqual({
      year: 2023,
      month: 2,
      day: 28,
    })
    expect(addAge(birthAt(2024, 2, 29), { years: 1, months: 0, days: 0, hours: 0 })).toEqual({
      year: 2025,
      month: 2,
      day: 28,
    })
    expect(addAge(birthAt(2024, 2, 29), { years: 4, months: 0, days: 0, hours: 0 })).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    })
  })

  it('해를 넘는 월을 더한다', () => {
    expect(addAge(birthAt(2024, 11, 15), { years: 0, months: 3, days: 0, hours: 0 })).toEqual({
      year: 2025,
      month: 2,
      day: 15,
    })
    expect(addAge(birthAt(2024, 12, 31), { years: 1, months: 11, days: 0, hours: 0 })).toEqual({
      year: 2026,
      month: 11,
      day: 30,
    })
  })

  it('일과 시간을 더한다. 시간이 하루를 넘기면 날짜가 늘어난다', () => {
    expect(addAge(birthAt(2024, 3, 10), { years: 0, months: 0, days: 5, hours: 0 })).toEqual({
      year: 2024,
      month: 3,
      day: 15,
    })
    expect(addAge(birthAt(2024, 3, 10, 20), { years: 0, months: 0, days: 0, hours: 3 })).toEqual({
      year: 2024,
      month: 3,
      day: 10,
    })
    expect(addAge(birthAt(2024, 3, 10, 20), { years: 0, months: 0, days: 0, hours: 4 })).toEqual({
      year: 2024,
      month: 3,
      day: 11,
    })
    expect(addAge(birthAt(2024, 3, 10, 20), { years: 0, months: 0, days: 0, hours: 2 })).toEqual({
      year: 2024,
      month: 3,
      day: 10,
    })
    expect(addAge(birthAt(2024, 2, 28), { years: 0, months: 0, days: 2, hours: 0 })).toEqual({
      year: 2024,
      month: 3,
      day: 1,
    })
  })
})
