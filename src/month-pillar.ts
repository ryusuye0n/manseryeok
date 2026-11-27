// 월주(그달의 간지)를 구한다. 월주는 음력 달이 아니라 24절기 중 12절(절기 시각)에 바뀐다.
//
// 월지(달의 지지)는 절기가 정한다.
//   소한 축, 입춘 인, 경칩 묘, 청명 진, 입하 사, 망종 오,
//   소서 미, 입추 신, 백로 유, 한로 술, 입동 해, 대설 자
// 월간(달의 천간)은 연간에서 정해진다 (오호둔).
//   갑/기년 병인월부터, 을/경년 무인월부터, 병/신년 경인월부터,
//   정/임년 임인월부터, 무/계년 갑인월부터 시작해 달마다 천간이 하나씩 간다.

import type { CivilDateTime } from './civil-date-time'
import { type Pillar, pillarFromIndex, pillarFromStemBranch } from './ganzhi'
import { SOLAR_TERM_NAMES } from './solar-term-names'
import { getCurrentSolarTerm } from './solar-terms'
import { getSajuYear } from './year-pillar'

const FIRST_GAPJA_YEAR = 4
const TIGER_BRANCH_INDEX = 2 // 인(寅)

// 시각이 속한 달의 월주를 돌려준다. 입력은 서머타임을 뺀 UTC+9 표준시다 (toKoreaStandardTime 참고).
// 절기 시각은 1920~2028년은 한국천문연구원 표, 그 밖은 계산값이다. 계산값은 분 단위로 어긋날 수 있어서
// 절기 직전과 직후 몇 분 안에 태어난 경우는 월주가 다를 수 있다.
// 1900년 첫 소한 전은 RangeError다.
export function getMonthPillar(at: CivilDateTime): Pillar {
  const current = getCurrentSolarTerm(at)
  const termIndex = SOLAR_TERM_NAMES.indexOf(current.name)
  // 월을 바꾸는 것은 12절(짝수 번호: 소한, 입춘, 경칩...)이다. 중기(대한, 우수...)면 직전 절이다.
  const jieIndex = termIndex % 2 === 0 ? termIndex : termIndex - 1
  const branchIndex = (jieIndex / 2 + 1) % 12
  // 인월을 0으로 센 몇 번째 달인지
  const monthNumber = (branchIndex - TIGER_BRANCH_INDEX + 12) % 12
  const yearStem = pillarFromIndex(getSajuYear(at) - FIRST_GAPJA_YEAR).index % 10
  const tigerMonthStem = ((yearStem % 5) * 2 + 2) % 10
  return pillarFromStemBranch((tigerMonthStem + monthNumber) % 10, branchIndex)
}
