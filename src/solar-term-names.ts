// 24절기 이름과 태양황경. 소한에서 시작해 동지로 끝나는 한 해의 순서다.
// 표 생성 스크립트도 이 파일을 가져다 쓰므로 다른 파일을 가져오지 않는다.

export const SOLAR_TERM_NAMES = [
  '소한',
  '대한',
  '입춘',
  '우수',
  '경칩',
  '춘분',
  '청명',
  '곡우',
  '입하',
  '소만',
  '망종',
  '하지',
  '소서',
  '대서',
  '입추',
  '처서',
  '백로',
  '추분',
  '한로',
  '상강',
  '입동',
  '소설',
  '대설',
  '동지',
] as const

export type SolarTermName = (typeof SOLAR_TERM_NAMES)[number]

// 소한은 태양황경 285도이고, 15도씩 늘어나 동지(270도)로 끝난다.
export const SOLAR_TERM_LONGITUDES: readonly number[] = SOLAR_TERM_NAMES.map(
  (_name, index) => (285 + 15 * index) % 360,
)
