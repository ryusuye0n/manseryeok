// 한국천문연구원 표와 같은 기준의 연, 월, 일, 시, 분이다. 기준은 서머타임을 뺀 UTC+9 표준시다.
// 서머타임(1948~1951, 1955~1960, 1987~1988년)과 UTC+8:30 시기(1954~1961년)에 적힌 벽시계 시각은
// 이 기준으로 먼저 바꾸어서 넣어야 한다. 이 라이브러리는 아직 그 변환을 하지 않는다.
// 바꾸지 않고 넣으면 절기 경계 근처에서 이웃한 절기가 나올 수 있다 (서머타임은 1시간, UTC+8:30은 30분).
export interface CivilDateTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}
