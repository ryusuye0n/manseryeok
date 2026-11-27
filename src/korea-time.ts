// 한국에서 사람들이 쓰던 벽시계 시각을 UTC+9 표준시로 바꾼다.
//
// 한국은 시기마다 시계가 달랐다: 1908년 이전 지방평균시, UTC+8:30, UTC+9, 서머타임.
// 절기 표와 계산은 UTC+9 표준시 기준이라서, 그 시기에 태어난 사람의 시각은 먼저 바꿔야 한다.
//
// 출처: IANA 시간대 데이터베이스(2026a)의 Asia/Seoul. Node의 시간대 데이터와 같은 값이다.
// 테스트가 Node의 시간대 데이터와 비교해서 아래 표가 맞는지 확인한다.

import { assertCivilDateTime, type CivilDateTime } from './civil-date-time'

interface Segment {
  // 이 구간이 시작되는 순간 (UTC, 밀리초)
  readonly from: number
  // 이 구간의 벽시계 시각 = UTC + offset
  readonly offsetSeconds: number
}

// [전환 순간(UTC), 그 뒤의 UTC 오프셋(초)]. 1908년 이전에는 서울 지방평균시(+8:27:52)였다.
const TRANSITIONS: readonly (readonly [string, number])[] = [
  ['1908-03-31T15:32:08Z', 30_600], // 1908-04-01 지방평균시 -> UTC+8:30
  ['1911-12-31T15:30:00Z', 32_400], // 1912-01-01 UTC+8:30 -> UTC+9
  ['1948-05-31T15:00:00Z', 36_000], // 서머타임 시작
  ['1948-09-12T14:00:00Z', 32_400], // 서머타임 끝
  ['1949-04-02T15:00:00Z', 36_000],
  ['1949-09-10T14:00:00Z', 32_400],
  ['1950-03-31T15:00:00Z', 36_000],
  ['1950-09-09T14:00:00Z', 32_400],
  ['1951-05-05T15:00:00Z', 36_000],
  ['1951-09-08T14:00:00Z', 32_400],
  ['1954-03-20T15:00:00Z', 30_600], // 1954-03-21 UTC+9 -> UTC+8:30
  ['1955-05-04T15:30:00Z', 34_200], // UTC+8:30 + 서머타임(UTC+9:30) 시작
  ['1955-09-08T14:30:00Z', 30_600],
  ['1956-05-19T15:30:00Z', 34_200],
  ['1956-09-29T14:30:00Z', 30_600],
  ['1957-05-04T15:30:00Z', 34_200],
  ['1957-09-21T14:30:00Z', 30_600],
  ['1958-05-03T15:30:00Z', 34_200],
  ['1958-09-20T14:30:00Z', 30_600],
  ['1959-05-02T15:30:00Z', 34_200],
  ['1959-09-19T14:30:00Z', 30_600],
  ['1960-04-30T15:30:00Z', 34_200],
  ['1960-09-17T14:30:00Z', 30_600],
  ['1961-08-09T15:30:00Z', 32_400], // 1961-08-10 UTC+8:30 -> UTC+9
  ['1987-05-09T17:00:00Z', 36_000],
  ['1987-10-10T17:00:00Z', 32_400],
  ['1988-05-07T17:00:00Z', 36_000],
  ['1988-10-08T17:00:00Z', 32_400],
]

const LOCAL_MEAN_TIME_SECONDS = 30_472
const STANDARD_OFFSET_MS = 9 * 3_600_000

const SEGMENTS: readonly Segment[] = [
  { from: Number.NEGATIVE_INFINITY, offsetSeconds: LOCAL_MEAN_TIME_SECONDS },
  ...TRANSITIONS.map(([at, offsetSeconds]) => ({ from: Date.parse(at), offsetSeconds })),
]

export const KOREA_TIME_YEARS: { readonly first: number; readonly last: number } = Object.freeze({
  first: 1900,
  last: 2150,
})

export interface KoreaStandardTime {
  // UTC+9 표준시로 바꾼 시각 (분 단위, 초는 가까운 분으로 반올림)
  time: CivilDateTime
  // 시계가 되감겨 같은 시각이 두 번 있었던 경우 true. options.ambiguous로 어느 쪽을 쓸지 정한다.
  ambiguous: boolean
}

export interface KoreaTimeOptions {
  // 같은 시각이 두 번 있을 때 먼저 온 쪽(earlier, 기본값)을 쓸지 나중 쪽(later)을 쓸지
  ambiguous?: 'earlier' | 'later'
}

// 한국에서 사람들이 쓰던 벽시계 시각을 UTC+9 표준시로 바꾼다.
// - 시계가 건너뛰어 존재하지 않았던 시각(예: 1948-06-01 00:30)은 RangeError다.
//   다만 그 분 안에 존재하는 초가 있으면(1908-04-01 00:02) 그 순간을 쓴다.
// - 시계가 되감겨 같은 시각이 두 번 있었던 경우는 ambiguous: true로 알리고 options.ambiguous를 따른다.
// - 1900~2150년만 지원한다. 1988년 이후는 UTC+9로 본다.
export function toKoreaStandardTime(
  wall: CivilDateTime,
  options: KoreaTimeOptions = {},
): KoreaStandardTime {
  assertCivilDateTime(wall)
  if (wall.year < KOREA_TIME_YEARS.first || wall.year > KOREA_TIME_YEARS.last) {
    throw new RangeError(
      `지원하는 연도는 ${KOREA_TIME_YEARS.first}~${KOREA_TIME_YEARS.last}년이다: ${wall.year}`,
    )
  }
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)
  const instantsAt = (wallMs: number): number[] =>
    SEGMENTS.flatMap((segment, index) => {
      const instant = wallMs - segment.offsetSeconds * 1000
      const end = SEGMENTS[index + 1]?.from ?? Number.POSITIVE_INFINITY
      return instant >= segment.from && instant < end ? [instant] : []
    })
  // 분 단위 입력은 초가 0이라고 보고 먼저 찾는다. 1908-04-01 00:02처럼 건너뛴 구간이
  // 분의 앞쪽 몇 초뿐이라면(00:00:00~00:02:07) 그 분의 끝(59초)에 존재하는 순간으로 대신한다.
  let instants = instantsAt(wallAsUtc)
  if (instants.length === 0) instants = instantsAt(wallAsUtc + 59_000)
  const earlier = instants[0]
  const later = instants[instants.length - 1]
  if (earlier === undefined || later === undefined) {
    throw new RangeError(
      `시계가 건너뛰어 존재하지 않았던 시각이다: ${wall.year}-${wall.month}-${wall.day} ${wall.hour}:${wall.minute}`,
    )
  }
  const instant = options.ambiguous === 'later' ? later : earlier
  const standard = new Date(Math.round((instant + STANDARD_OFFSET_MS) / 60_000) * 60_000)
  return {
    time: {
      year: standard.getUTCFullYear(),
      month: standard.getUTCMonth() + 1,
      day: standard.getUTCDate(),
      hour: standard.getUTCHours(),
      minute: standard.getUTCMinutes(),
    },
    ambiguous: instants.length > 1,
  }
}
