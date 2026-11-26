import { describe, expect, it } from 'vitest'
import {
  type CivilDateTime,
  getSolarTermPeriod,
  KOREA_TIME_YEARS,
  toKoreaStandardTime,
} from '../src/index'

const at = (year: number, month: number, day: number, hour = 0, minute = 0): CivilDateTime => ({
  year,
  month,
  day,
  hour,
  minute,
})

const text = (time: CivilDateTime): string =>
  `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')} ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`

const standard = (wall: CivilDateTime, later = false): string =>
  text(toKoreaStandardTime(wall, { ambiguous: later ? 'later' : 'earlier' }).time)

describe('toKoreaStandardTime: 알려진 시각', () => {
  it('UTC+9였던 시기는 그대로다', () => {
    expect(standard(at(2024, 2, 4, 17, 27))).toBe('2024-02-04 17:27')
    expect(standard(at(1930, 6, 1, 12, 0))).toBe('1930-06-01 12:00')
    expect(standard(at(1990, 1, 1, 0, 0))).toBe('1990-01-01 00:00')
  })

  it('1987~1988년 서머타임은 1시간을 뺀다 (PR 리뷰에서 지적된 1988년 소서 예)', () => {
    expect(standard(at(1988, 7, 7, 6, 40))).toBe('1988-07-07 05:40')
    expect(toKoreaStandardTime(at(1988, 7, 7, 6, 40)).ambiguous).toBe(false)
  })

  it('서머타임이 아닌 1988년 겨울은 그대로다', () => {
    expect(standard(at(1988, 12, 25, 9, 0))).toBe('1988-12-25 09:00')
  })

  it('1954~1961년 UTC+8:30 시기는 30분을 더한다', () => {
    expect(standard(at(1957, 1, 15, 12, 0))).toBe('1957-01-15 12:30')
    expect(standard(at(1954, 12, 31, 23, 45))).toBe('1955-01-01 00:15')
  })

  it('UTC+8:30에 서머타임이 겹친 시기(UTC+9:30)는 30분을 뺀다', () => {
    expect(standard(at(1958, 7, 1, 12, 0))).toBe('1958-07-01 11:30')
  })

  it('1908~1911년 UTC+8:30은 30분을 더한다', () => {
    expect(standard(at(1910, 6, 1, 12, 0))).toBe('1910-06-01 12:30')
  })

  it('1908년 4월 1일 전 지방평균시(+8:27:52)는 32분 8초를 더하고 가까운 분으로 반올림한다', () => {
    expect(standard(at(1905, 6, 1, 12, 0))).toBe('1905-06-01 12:32')
  })

  it('전환 직후는 새 규칙을 쓴다', () => {
    expect(standard(at(1948, 5, 31, 23, 59))).toBe('1948-05-31 23:59')
    expect(standard(at(1948, 6, 1, 1, 0))).toBe('1948-06-01 00:00')
    expect(standard(at(1961, 8, 10, 0, 30))).toBe('1961-08-10 00:30')
    expect(standard(at(1961, 8, 9, 23, 59))).toBe('1961-08-10 00:29')
  })

  it('윤일과 해가 바뀌는 순간도 맞다', () => {
    expect(standard(at(1956, 2, 29, 0, 10))).toBe('1956-02-29 00:40')
    expect(standard(at(1911, 12, 31, 23, 59))).toBe('1912-01-01 00:29')
  })
})

describe('toKoreaStandardTime: 존재하지 않는 시각과 겹치는 시각', () => {
  it.each([
    ['1908-04-01 00:01 (지방평균시에서 UTC+8:30으로 건너뜀)', at(1908, 4, 1, 0, 1)],
    ['1912-01-01 00:15 (UTC+8:30에서 UTC+9로 건너뜀)', at(1912, 1, 1, 0, 15)],
    ['1948-06-01 00:30 (서머타임 시작)', at(1948, 6, 1, 0, 30)],
    ['1955-05-05 00:30 (서머타임 시작)', at(1955, 5, 5, 0, 30)],
    ['1961-08-10 00:15 (UTC+8:30에서 UTC+9로 건너뜀)', at(1961, 8, 10, 0, 15)],
    ['1987-05-10 02:30 (서머타임 시작)', at(1987, 5, 10, 2, 30)],
  ])('%s은 RangeError다', (_label, wall) => {
    expect(() => toKoreaStandardTime(wall)).toThrow(RangeError)
  })

  it('서머타임이 끝나며 같은 시각이 두 번 있으면 ambiguous로 알리고 먼저/나중 쪽을 고를 수 있다', () => {
    // 1948-09-12 23:30은 서머타임(UTC+10) 때와 끝난 뒤(UTC+9) 두 번 있었다
    const wall = at(1948, 9, 12, 23, 30)
    expect(toKoreaStandardTime(wall).ambiguous).toBe(true)
    expect(standard(wall)).toBe('1948-09-12 22:30')
    expect(standard(wall, true)).toBe('1948-09-12 23:30')
  })

  it('기본값은 먼저 온 쪽이다', () => {
    const wall = at(1988, 10, 9, 2, 30)
    expect(toKoreaStandardTime(wall).time).toEqual(
      toKoreaStandardTime(wall, { ambiguous: 'earlier' }).time,
    )
    expect(toKoreaStandardTime(wall).ambiguous).toBe(true)
  })

  it('UTC+9에서 UTC+8:30으로 바뀌는 1954-03-21에도 같은 시각이 두 번 있다', () => {
    const wall = at(1954, 3, 20, 23, 45)
    expect(toKoreaStandardTime(wall).ambiguous).toBe(true)
    expect(standard(wall)).toBe('1954-03-20 23:45')
    expect(standard(wall, true)).toBe('1954-03-21 00:15')
  })

  it('겹치는 구간이 끝난 직후 시각은 겹치지 않는다 (전환 순간이 이전 구간에 포함되지 않는다)', () => {
    // 1948-09-12 23:00~24:00이 두 번 있었고, 09-13 00:00은 한 번뿐이다
    expect(toKoreaStandardTime(at(1948, 9, 13, 0, 0)).ambiguous).toBe(false)
    expect(standard(at(1948, 9, 13, 0, 0))).toBe('1948-09-13 00:00')
    // 1988-10-09 02:00~03:00이 두 번 있었고, 03:00은 한 번뿐이다
    expect(toKoreaStandardTime(at(1988, 10, 9, 3, 0)).ambiguous).toBe(false)
    expect(standard(at(1988, 10, 9, 3, 0))).toBe('1988-10-09 03:00')
    expect(toKoreaStandardTime(at(1988, 10, 9, 2, 0)).ambiguous).toBe(true)
  })

  it('겹치지도 건너뛰지도 않은 시각은 ambiguous가 false다', () => {
    expect(toKoreaStandardTime(at(1988, 10, 9, 1, 30)).ambiguous).toBe(false)
    expect(toKoreaStandardTime(at(1988, 10, 9, 3, 30)).ambiguous).toBe(false)
  })
})

describe('toKoreaStandardTime: 잘못된 입력', () => {
  it('지원 범위는 1900~2150년이다', () => {
    expect(KOREA_TIME_YEARS).toEqual({ first: 1900, last: 2150 })
    expect(() => toKoreaStandardTime(at(1899, 12, 31, 23, 59))).toThrow('1900~2150')
    expect(() => toKoreaStandardTime(at(2151, 1, 1))).toThrow(RangeError)
    expect(standard(at(1900, 1, 1, 0, 0))).toBe('1900-01-01 00:32')
    expect(standard(at(2150, 12, 31, 23, 59))).toBe('2150-12-31 23:59')
  })

  it.each([
    ['13월', at(2024, 13, 1)],
    ['2월 30일', at(2024, 2, 30)],
    ['24시', at(2024, 2, 4, 24, 0)],
    ['60분', at(2024, 2, 4, 12, 60)],
    ['소수 분', at(2024, 2, 4, 12, 1.5)],
    ['NaN 연도', at(Number.NaN, 2, 4)],
  ])('%s는 RangeError를 낸다', (_name, wall) => {
    expect(() => toKoreaStandardTime(wall)).toThrow(RangeError)
  })

  it('지원 범위 상수는 바꿀 수 없다', () => {
    expect(() => {
      ;(KOREA_TIME_YEARS as { first: number }).first = 1800
    }).toThrow(TypeError)
  })
})

describe('Node의 시간대 데이터(Asia/Seoul)와 비교', () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })

  const wallOf = (ms: number): { wall: CivilDateTime; seconds: number } => {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(ms)).map((part) => [part.type, Number(part.value)]),
    )
    return {
      wall: at(
        parts.year ?? 0,
        parts.month ?? 0,
        parts.day ?? 0,
        parts.hour ?? 0,
        parts.minute ?? 0,
      ),
      seconds: parts.second ?? 0,
    }
  }

  const offsetSeconds = (ms: number): number => {
    const { wall, seconds } = wallOf(ms)
    return (
      (Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, seconds) -
        Math.floor(ms / 1000) * 1000) /
      1000
    )
  }

  // 하루 간격으로 훑어서 오프셋이 바뀐 순간을 찾는다
  const transitions: number[] = []
  const start = Date.UTC(1900, 0, 1)
  const end = Date.UTC(2030, 0, 1)
  let previous = offsetSeconds(start)
  for (let ms = start + 86_400_000; ms < end; ms += 86_400_000) {
    const current = offsetSeconds(ms)
    if (current === previous) continue
    let low = ms - 86_400_000
    let high = ms
    while (high - low > 1000) {
      const middle = Math.floor((low + high) / 2)
      if (offsetSeconds(middle) === previous) low = middle
      else high = middle
    }
    transitions.push(high)
    previous = current
  }

  it('전환이 28번이다 (1900~2030년)', () => {
    expect(transitions).toHaveLength(28)
  })

  // 같은 순간을 Node는 벽시계로 알려 주고, 우리는 그 벽시계를 표준시로 바꾼다.
  // 표준시 = 그 순간 + 9시간이어야 한다. 시계가 되감긴 구간은 먼저나 나중 어느 한쪽과 같으면 된다.
  const expectedStandard = (ms: number): string => {
    const shifted = new Date(Math.round((ms + 9 * 3_600_000) / 60_000) * 60_000)
    return text(
      at(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth() + 1,
        shifted.getUTCDate(),
        shifted.getUTCHours(),
        shifted.getUTCMinutes(),
      ),
    )
  }

  const check = (ms: number): void => {
    const { wall } = wallOf(ms)
    const earlier = toKoreaStandardTime(wall, { ambiguous: 'earlier' })
    const later = toKoreaStandardTime(wall, { ambiguous: 'later' })
    const wanted = expectedStandard(ms)
    // 1908년 전 지방평균시는 초가 있어서 분 단위 입력과 최대 1분 차이가 난다
    if (ms < (transitions[0] ?? 0)) {
      const diff = Math.abs(
        Date.parse(`${text(earlier.time).replace(' ', 'T')}:00Z`) -
          Date.parse(`${wanted.replace(' ', 'T')}:00Z`),
      )
      expect(diff, `${new Date(ms).toISOString()}`).toBeLessThanOrEqual(60_000)
      return
    }
    expect([text(earlier.time), text(later.time)], new Date(ms).toISOString()).toContain(wanted)
    expect(earlier.ambiguous).toBe(later.ambiguous)
  }

  it('전환 앞뒤 3시간을 15분 간격으로 훑어도 모두 맞다', () => {
    for (const transition of transitions) {
      const base = Math.floor(transition / 60_000) * 60_000
      for (let ms = base - 3 * 3_600_000; ms <= base + 3 * 3_600_000; ms += 900_000) {
        check(ms)
      }
    }
  })

  it('1900~2030년을 25시간 간격(시각이 날마다 달라진다)으로 훑어도 모두 맞다', () => {
    for (let ms = Date.UTC(1900, 0, 2); ms < end; ms += 25 * 3_600_000) check(ms)
  }, 30_000)

  it('우리가 건너뛰었다고 하는 시각을 Node도 존재하지 않는다고 한다', () => {
    // 건너뛴 시각을 Node 쪽에서 되돌려 읽어 보면 다른 벽시계로 바뀌어 나온다
    const skipped = [at(1948, 6, 1, 0, 30), at(1955, 5, 5, 0, 30), at(1987, 5, 10, 2, 30)]
    for (const wall of skipped) {
      const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)
      const seen = [-36_000, -34_200, -32_400, -30_600].some((delta) => {
        const back = wallOf(guess + delta * 1000).wall
        return text(back) === text(wall)
      })
      expect(seen, text(wall)).toBe(false)
    }
  })
})

describe('절기 조회와 함께 쓰기', () => {
  it('1988년 서머타임 중 소서 직전(벽시계 06:40)은 변환하면 하지, 그대로 넣으면 소서다', () => {
    const wall = at(1988, 7, 7, 6, 40)
    expect(getSolarTermPeriod(wall).current.name).toBe('소서')
    expect(getSolarTermPeriod(toKoreaStandardTime(wall).time).current.name).toBe('하지')
  })
})
