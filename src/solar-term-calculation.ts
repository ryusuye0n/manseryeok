// 태양 황경으로 24절기 시각을 계산한다. 한국천문연구원 표가 없는 연도에 쓴다.

import type { CivilDateTime } from './civil-date-time'
import { SOLAR_LONGITUDE_YEARS, solveSolarLongitude } from './solar-longitude'
import { SOLAR_TERM_LONGITUDES } from './solar-term-names'

const KST_OFFSET_MS = 9 * 3_600_000
const MS_PER_MINUTE = 60_000
// 소한(태양황경 285도)은 매년 1월 5~6일쯤이고 절기 사이는 평균 15.22일이다.
const FIRST_TERM_GUESS_DAY = 5
const MEAN_TERM_DAYS = 365.2422 / 24

export const SOLAR_TERM_CALCULATION_YEARS: { readonly first: number; readonly last: number } =
  SOLAR_LONGITUDE_YEARS

// 한 해의 24절기 시각을 소한부터 동지까지 한국 표준시(UTC+9) 분 단위로 돌려준다.
// 초는 가까운 분으로 반올림한다. 한국천문연구원 표와 같은 방식이다.
export function calculateSolarTermTimes(year: number): CivilDateTime[] {
  if (
    !Number.isInteger(year) ||
    year < SOLAR_TERM_CALCULATION_YEARS.first ||
    year > SOLAR_TERM_CALCULATION_YEARS.last
  ) {
    throw new RangeError(
      `계산할 수 있는 연도는 ${SOLAR_TERM_CALCULATION_YEARS.first}~${SOLAR_TERM_CALCULATION_YEARS.last}년이다: ${year}`,
    )
  }
  const start = Date.UTC(year, 0, FIRST_TERM_GUESS_DAY)
  return SOLAR_TERM_LONGITUDES.map((longitude, index) => {
    const guess = start + index * MEAN_TERM_DAYS * 86_400_000
    const utcMs = solveSolarLongitude(longitude, guess, year)
    const kst = new Date(Math.round((utcMs + KST_OFFSET_MS) / MS_PER_MINUTE) * MS_PER_MINUTE)
    return {
      year: kst.getUTCFullYear(),
      month: kst.getUTCMonth() + 1,
      day: kst.getUTCDate(),
      hour: kst.getUTCHours(),
      minute: kst.getUTCMinutes(),
    }
  })
}
