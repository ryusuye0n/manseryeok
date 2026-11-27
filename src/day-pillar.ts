// 일주(그날의 간지)를 구한다.
// 일주는 60일마다 되풀이되므로 기준일 하나와 날짜 차이만 있으면 계산할 수 있다.

import { assertCivilDateTime, type CivilDateTime } from './civil-date-time'
import { type Pillar, pillarFromIndex } from './ganzhi'

// 기준일: 2000년 1월 1일은 무오일(60갑자의 54번째, 갑자가 0)이다.
// 외부 라이브러리(lunar-javascript)의 1900~2150년 모든 날짜와 비교해서 확인했다.
const REFERENCE_DAY = Date.UTC(2000, 0, 1) / 86_400_000
const REFERENCE_INDEX = 54

export const DAY_PILLAR_YEARS: { readonly first: number; readonly last: number } = Object.freeze({
  first: 1900,
  last: 2150,
})

// 날짜(그레고리력)의 60갑자 순서. 범위 검사는 하지 않는다. day가 달의 끝을 넘으면 다음 달로 넘어간다.
// 연도는 그대로 쓴다 (Date.UTC는 0~99년을 1900~1999년으로 바꾸므로 setUTCFullYear로 계산한다).
export function dayIndexOfDate(year: number, month: number, day: number): number {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  const days = date.getTime() / 86_400_000
  return (((REFERENCE_INDEX + (days - REFERENCE_DAY)) % 60) + 60) % 60
}

export interface DayPillarOptions {
  // 날짜가 바뀌는 시각. 자시(23:00~01:00)를 어느 날로 볼지를 정한다.
  // - '00:00'(기본값): 자정에 바뀐다. 23:00~24:00도 그날이다 (야자시를 인정하는 쪽).
  // - '23:00': 23:00부터 다음 날로 본다 (자시가 시작되는 때부터 날이 바뀐다고 보는 쪽).
  dayChangeAt?: '00:00' | '23:00'
}

// 시각이 속한 날의 일주를 돌려준다. 입력은 서머타임을 뺀 UTC+9 표준시다 (toKoreaStandardTime 참고).
export function getDayPillar(at: CivilDateTime, options?: DayPillarOptions): Pillar {
  const dayChangeAt = options?.dayChangeAt
  if (dayChangeAt !== undefined && dayChangeAt !== '00:00' && dayChangeAt !== '23:00') {
    throw new RangeError(
      `options.dayChangeAt은 '00:00' 또는 '23:00'이어야 한다: ${JSON.stringify(dayChangeAt)}`,
    )
  }
  assertCivilDateTime(at)
  if (at.year < DAY_PILLAR_YEARS.first || at.year > DAY_PILLAR_YEARS.last) {
    throw new RangeError(
      `지원하는 연도는 ${DAY_PILLAR_YEARS.first}~${DAY_PILLAR_YEARS.last}년이다: ${at.year}`,
    )
  }
  const extraDay = dayChangeAt === '23:00' && at.hour >= 23 ? 1 : 0
  return pillarFromIndex(dayIndexOfDate(at.year, at.month, at.day + extraDay))
}
