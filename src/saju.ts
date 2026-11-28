// 사주 8자(연주, 월주, 일주, 시주)를 한 번에 구한다.
//
// 출생 시각은 사람들이 기억하는 한국의 벽시계 시각(서머타임, UTC+8:30 시기 포함)으로 받는다.
// 안에서 UTC+9 표준시로 바꾼 뒤(toKoreaStandardTime) 연주, 월주, 일주, 시주를 구한다.
// 시각을 모르면 날짜만으로 연주, 월주, 일주를 구하고 시주는 null이다.
// 결과에는 믿고 쓸 수 있는 정도를 알려 주는 경고가 함께 들어 있다.

import { assertCivilDateTime, type CivilDateTime } from './civil-date-time'
import { getDayPillar } from './day-pillar'
import type { Pillar } from './ganzhi'
import { getHourPillar } from './hour-pillar'
import { KOREA_TIME_YEARS, toKoreaStandardTime } from './korea-time'
import { getMonthPillar } from './month-pillar'
import type { SolarTermName } from './solar-term-names'
import { getJieTerms, type SolarTerm } from './solar-terms'
import { getYearPillar } from './year-pillar'

export interface BirthInput {
  // 양력 출생 연월일
  year: number
  month: number
  day: number
  // 출생 시각(한국의 벽시계 시각). 모르면 둘 다 생략한다. 하나만 주면 RangeError다.
  hour?: number
  minute?: number
}

export interface SajuOptions {
  // 날짜가 바뀌는 시각. 일주에만 영향을 준다 (getDayPillar의 dayChangeAt과 같다).
  dayChangeAt?: '00:00' | '23:00'
  // 시계가 되감겨 같은 시각이 두 번 있었던 경우 먼저 온 쪽(earlier, 기본값)과 나중 쪽(later) 중 무엇을 쓸지
  ambiguousTime?: 'earlier' | 'later'
}

export interface FourPillars {
  year: Pillar
  month: Pillar
  day: Pillar
  // 출생 시각을 모르면 null이다.
  hour: Pillar | null
}

export type SajuPillarName = 'year' | 'month'

export type SajuWarning =
  | {
      // 절기 시각 바로 앞뒤에 태어났다. 연주나 월주가 다를 수 있다.
      type: 'solar-term-near'
      term: SolarTermName
      // 출생 시각에서 절기 시각을 뺀 분. 음수면 절기 전, 양수면 절기 후다.
      minutesFromTerm: number
      source: SolarTerm['source']
      affects: SajuPillarName[]
    }
  | {
      // 출생 시각을 모르는데 그날 안에 연주나 월주를 바꾸는 절기가 있다. 시각에 따라 달라진다.
      type: 'solar-term-on-day'
      term: SolarTermName
      // 절기 시각. 한국천문연구원 표와 같은 UTC+9 표준시다 (벽시계 시각이 아니다).
      // 서머타임이나 UTC+8:30 시기에는 벽시계보다 30분~1시간 앞서거나 뒤처진다.
      time: CivilDateTime
      affects: SajuPillarName[]
    }
  | {
      // 시계가 되감겨 같은 시각이 두 번 있었다. options.ambiguousTime에 따라 골랐다.
      type: 'ambiguous-clock-time'
      chosen: 'earlier' | 'later'
    }
  | {
      // 23:00~24:00(야자시)에 태어났다. 일주를 어느 날로 볼지는 학파마다 다르다.
      type: 'night-zi'
      dayChangeAt: '00:00' | '23:00'
    }

export interface Saju {
  pillars: FourPillars
  // 계산에 쓴 UTC+9 표준시. 출생 시각을 모르면 null이다.
  standardTime: CivilDateTime | null
  warnings: SajuWarning[]
}

// 절기 시각과 이 분 이하로 가까우면 경고한다. 한국천문연구원 표는 분 단위로 반올림되어 있고,
// 표 밖의 계산값은 몇 분까지 어긋날 수 있어서 더 넓게 잡는다.
const NEAR_MINUTES = { table: 2, calculated: 10 } as const

const toMs = (time: CivilDateTime): number =>
  Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute)

const affectedBy = (term: SolarTerm): SajuPillarName[] =>
  term.name === '입춘' ? ['year', 'month'] : ['month']

// 벽시계로 그날 00:00을 표준시로 바꾼 순간(밀리초). 시계가 건너뛰어 00:00이 없던 날
// (1948-06-01처럼 00:00~01:00이 없던 날)은 그날 처음 존재하는 시각이다.
// 지원 범위(2150년) 다음 날이면 끝이 없는 것으로 본다.
export function startOfWallDayMs(year: number, month: number, day: number): number {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() > KOREA_TIME_YEARS.last) return Number.POSITIVE_INFINITY
  for (let minutes = 0; minutes < 180; minutes++) {
    try {
      return toMs(
        toKoreaStandardTime({
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
          hour: Math.floor(minutes / 60),
          minute: minutes % 60,
        }).time,
      )
    } catch (error) {
      if (!(error instanceof RangeError)) throw error
    }
  }
  throw new RangeError(`그날 시계의 첫 시각을 찾을 수 없다: ${year}-${month}-${day}`)
}

function assertOptions(options: SajuOptions | undefined): void {
  const dayChangeAt = options?.dayChangeAt
  if (dayChangeAt !== undefined && dayChangeAt !== '00:00' && dayChangeAt !== '23:00') {
    throw new RangeError(
      `options.dayChangeAt은 '00:00' 또는 '23:00'이어야 한다: ${JSON.stringify(dayChangeAt)}`,
    )
  }
  const ambiguousTime = options?.ambiguousTime
  if (ambiguousTime !== undefined && ambiguousTime !== 'earlier' && ambiguousTime !== 'later') {
    throw new RangeError(
      `options.ambiguousTime은 'earlier' 또는 'later'여야 한다: ${JSON.stringify(ambiguousTime)}`,
    )
  }
}

export function getSaju(birth: BirthInput, options?: SajuOptions): Saju {
  assertOptions(options)
  const { year, month, day, hour, minute } = birth
  if ((hour === undefined) !== (minute === undefined)) {
    throw new RangeError('출생 시각은 hour와 minute를 함께 주거나 둘 다 생략해야 한다')
  }
  const dayChangeAt = options?.dayChangeAt ?? '00:00'
  const ambiguousTime = options?.ambiguousTime ?? 'earlier'
  const warnings: SajuWarning[] = []

  if (hour === undefined || minute === undefined) {
    // 시각을 모르면 벽시계로 그날 정오를 표준시로 바꿔서 연주, 월주, 일주만 구한다
    const wallNoon: CivilDateTime = { year, month, day, hour: 12, minute: 0 }
    assertCivilDateTime(wallNoon)
    const noon = toKoreaStandardTime(wallNoon).time
    const pillars: FourPillars = {
      year: getYearPillar(noon),
      month: getMonthPillar(noon),
      day: getDayPillar(noon, { dayChangeAt }),
      hour: null,
    }
    // 벽시계로 그날 하루(00:00 이상 다음 날 00:00 미만)를 표준시 구간으로 바꿔서, 그 안에 든 12절을 찾는다.
    // 서머타임이나 UTC+8:30 시기에는 표준시 날짜와 벽시계 날짜가 어긋날 수 있다.
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1))
    const startMs = startOfWallDayMs(year, month, day)
    const endMs = startOfWallDayMs(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
    )
    const years = new Set([new Date(startMs).getUTCFullYear()])
    if (Number.isFinite(endMs)) years.add(new Date(endMs).getUTCFullYear())
    for (const termYear of years) {
      for (const term of getJieTerms(termYear)) {
        const termMs = toMs(term)
        if (termMs >= startMs && termMs < endMs) {
          warnings.push({
            type: 'solar-term-on-day',
            term: term.name,
            time: {
              year: term.year,
              month: term.month,
              day: term.day,
              hour: term.hour,
              minute: term.minute,
            },
            affects: affectedBy(term),
          })
        }
      }
    }
    return { pillars, standardTime: null, warnings }
  }

  const converted = toKoreaStandardTime(
    { year, month, day, hour, minute },
    { ambiguous: ambiguousTime },
  )
  const standard = converted.time
  if (converted.ambiguous) warnings.push({ type: 'ambiguous-clock-time', chosen: ambiguousTime })
  if (standard.hour >= 23) warnings.push({ type: 'night-zi', dayChangeAt })

  const pillars: FourPillars = {
    year: getYearPillar(standard),
    month: getMonthPillar(standard),
    day: getDayPillar(standard, { dayChangeAt }),
    hour: getHourPillar(standard),
  }

  const at = toMs(standard)
  let nearest: { term: SolarTerm; minutes: number } | undefined
  for (const term of getJieTerms(standard.year)) {
    const minutes = (at - toMs(term)) / 60_000
    if (nearest === undefined || Math.abs(minutes) < Math.abs(nearest.minutes)) {
      nearest = { term, minutes }
    }
  }
  if (nearest !== undefined && Math.abs(nearest.minutes) <= NEAR_MINUTES[nearest.term.source]) {
    warnings.push({
      type: 'solar-term-near',
      term: nearest.term.name,
      minutesFromTerm: nearest.minutes,
      source: nearest.term.source,
      affects: affectedBy(nearest.term),
    })
  }
  return { pillars, standardTime: standard, warnings }
}
