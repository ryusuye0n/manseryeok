// 한국천문연구원 표와 같은 기준의 연, 월, 일, 시, 분이다. 기준은 서머타임을 뺀 UTC+9 표준시다.
// 아래 시기에 적힌 벽시계 시각은 이 기준으로 먼저 바꾸어서 넣어야 한다.
// toKoreaStandardTime이 그 변환을 한다.
// - 1908년 4월 1일 이전: 지방평균시 (서울 기준 약 UTC+8:28)
// - 1908년 4월 1일 ~ 1911년 12월 31일: UTC+8:30
// - 1948~1951, 1987~1988년: 서머타임 (UTC+10)
// - 1954년 3월 21일 ~ 1961년 8월 9일: UTC+8:30
// - 1955~1960년 서머타임 기간: UTC+8:30 위에 서머타임 (UTC+9:30)
// 바꾸지 않고 넣으면 절기 경계 근처에서 이웃한 절기가 나올 수 있다 (30분에서 1시간 어긋난다).
export interface CivilDateTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export function assertCivilDateTime(at: CivilDateTime): void {
  const { year, month, day, hour, minute } = at
  const integers = [year, month, day, hour, minute].every(Number.isInteger)
  const date = new Date(Date.UTC(year, month - 1, day))
  const validDate =
    integers &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  if (!validDate || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new RangeError(`올바른 날짜와 시각이 아니다: ${JSON.stringify(at)}`)
  }
}
