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
import { toKoreaStandardTime } from './korea-time'
import { getMonthPillar } from './month-pillar'
import { SOLAR_TERM_NAMES, type SolarTermName } from './solar-term-names'
import { getSolarTerms, SOLAR_TERM_SUPPORTED_YEARS, type SolarTerm } from './solar-terms'
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

// 연주나 월주를 바꾸는 12절(소한, 입춘, 경칩 ...)
const isJie = (term: SolarTerm): boolean => SOLAR_TERM_NAMES.indexOf(term.name) % 2 === 0

const affectedBy = (term: SolarTerm): SajuPillarName[] =>
  term.name === '입춘' ? ['year', 'month'] : ['month']

function jieTermsAround(year: number): SolarTerm[] {
  return [year - 1, year, year + 1]
    .filter(
      (candidate) =>
        candidate >= SOLAR_TERM_SUPPORTED_YEARS.first &&
        candidate <= SOLAR_TERM_SUPPORTED_YEARS.last,
    )
    .flatMap((candidate) => getSolarTerms(candidate))
    .filter(isJie)
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
    // 시각을 모르면 그날 정오로 보고 연주, 월주, 일주만 구한다
    const noon: CivilDateTime = { year, month, day, hour: 12, minute: 0 }
    assertCivilDateTime(noon)
    const pillars: FourPillars = {
      year: getYearPillar(noon),
      month: getMonthPillar(noon),
      day: getDayPillar(noon, { dayChangeAt }),
      hour: null,
    }
    for (const term of jieTermsAround(year)) {
      if (term.year === year && term.month === month && term.day === day) {
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
  for (const term of jieTermsAround(standard.year)) {
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
