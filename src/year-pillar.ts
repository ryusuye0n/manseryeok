// 연주(그해의 간지)를 구한다. 연주는 설날이 아니라 입춘에 바뀐다.

import { assertCivilDateTime, type CivilDateTime, toKey } from './civil-date-time'
import { type Pillar, pillarFromIndex } from './ganzhi'
import { getSolarTerms, SOLAR_TERM_SUPPORTED_YEARS } from './solar-terms'

// 기원후 4년이 갑자년이다. 그래서 (연도 - 4)를 60으로 나눈 나머지가 60갑자 순서가 된다.
const FIRST_GAPJA_YEAR = 4

// 입춘을 기준으로 한 사주상의 해. 입춘 시각 전이면 전해다.
// 입춘 시각이 되는 순간부터(그 분 포함) 새해다.
export function getSajuYear(at: CivilDateTime): number {
  assertCivilDateTime(at)
  if (at.year < SOLAR_TERM_SUPPORTED_YEARS.first || at.year > SOLAR_TERM_SUPPORTED_YEARS.last) {
    throw new RangeError(
      `지원하는 연도는 ${SOLAR_TERM_SUPPORTED_YEARS.first}~${SOLAR_TERM_SUPPORTED_YEARS.last}년이다: ${at.year}`,
    )
  }
  const lichun = getSolarTerms(at.year).find((term) => term.name === '입춘')
  if (lichun === undefined) throw new Error(`${at.year}년 입춘을 찾을 수 없다`)
  return toKey(at) < toKey(lichun) ? at.year - 1 : at.year
}

// 시각이 속한 해의 연주를 돌려준다. 입력은 서머타임을 뺀 UTC+9 표준시다 (toKoreaStandardTime 참고).
// 입춘 시각은 1920~2028년은 한국천문연구원 표, 그 밖은 계산값이다. 계산값은 분 단위로 어긋날 수 있어서
// 입춘 직전과 직후 몇 분 안에 태어난 경우는 연주가 다를 수 있다.
export function getYearPillar(at: CivilDateTime): Pillar {
  return pillarFromIndex(getSajuYear(at) - FIRST_GAPJA_YEAR)
}
