// 시주(그 시각의 간지)를 구한다.
//
// 시지(시각의 지지)는 2시간마다 바뀌는 12시진이다.
//   자 23:00~01:00, 축 01:00~03:00, 인 03:00~05:00, 묘 05:00~07:00, 진 07:00~09:00, 사 09:00~11:00,
//   오 11:00~13:00, 미 13:00~15:00, 신 15:00~17:00, 유 17:00~19:00, 술 19:00~21:00, 해 21:00~23:00
// 시간(시각의 천간)은 일간에서 정해진다 (오자둔).
//   갑/기일은 갑자시부터, 을/경일은 병자시부터, 병/신일은 무자시부터,
//   정/임일은 경자시부터, 무/계일은 임자시부터 시작해 시진마다 천간이 하나씩 간다.
//
// 23:00~24:00(야자시)은 일주를 어떻게 정하든(DayPillarOptions) 시주의 천간은 다음 날 일간으로 정한다.
// 자시가 새 하루의 첫 시진이기 때문이다. 그래서 시주에는 날짜 변경 옵션이 없다.
//
// 출생지의 경도에 따른 진태양시 보정은 하지 않는다. 입력 시각(한국 표준시)으로 그대로 정한다.

import { assertCivilDateTime, type CivilDateTime } from './civil-date-time'
import { dayIndexOfDate } from './day-pillar'
import { type Pillar, pillarFromStemBranch } from './ganzhi'
import { SOLAR_LONGITUDE_YEARS } from './solar-longitude'

// 시각의 시주를 돌려준다. 입력은 서머타임을 뺀 UTC+9 표준시다 (toKoreaStandardTime 참고).
export function getHourPillar(at: CivilDateTime): Pillar {
  assertCivilDateTime(at)
  if (at.year < SOLAR_LONGITUDE_YEARS.first || at.year > SOLAR_LONGITUDE_YEARS.last) {
    throw new RangeError(
      `지원하는 연도는 ${SOLAR_LONGITUDE_YEARS.first}~${SOLAR_LONGITUDE_YEARS.last}년이다: ${at.year}`,
    )
  }
  const branchIndex = Math.floor((at.hour * 60 + at.minute + 60) / 120) % 12
  // 23:00부터는 새 하루의 자시라서 다음 날 일간을 쓴다
  const dayIndex = dayIndexOfDate(at.year, at.month, at.day + (at.hour >= 23 ? 1 : 0))
  const stemIndex = (((dayIndex % 10) % 5) * 2 + branchIndex) % 10
  return pillarFromStemBranch(stemIndex, branchIndex)
}
