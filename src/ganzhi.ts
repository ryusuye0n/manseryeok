// 천간 10개, 지지 12개와 이 둘을 짝지은 60갑자.
// 연주, 월주, 일주, 시주가 모두 이 정의를 쓴다.

export type HeavenlyStem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계'

export type EarthlyBranch =
  | '자'
  | '축'
  | '인'
  | '묘'
  | '진'
  | '사'
  | '오'
  | '미'
  | '신'
  | '유'
  | '술'
  | '해'

export const HEAVENLY_STEMS: readonly HeavenlyStem[] = Object.freeze([
  '갑',
  '을',
  '병',
  '정',
  '무',
  '기',
  '경',
  '신',
  '임',
  '계',
])

export const EARTHLY_BRANCHES: readonly EarthlyBranch[] = Object.freeze([
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
])

export interface Pillar {
  stem: HeavenlyStem
  branch: EarthlyBranch
  // 60갑자 안의 순서. 갑자가 0이고 계해가 59다.
  index: number
}

// 60갑자 순서(0~59)에서 간지를 만든다. 범위를 벗어난 정수는 60으로 나눈 나머지를 쓴다.
export function pillarFromIndex(value: number): Pillar {
  if (!Number.isInteger(value)) throw new RangeError(`60갑자 순서는 정수여야 한다: ${value}`)
  const index = ((value % 60) + 60) % 60
  const stem = HEAVENLY_STEMS[index % 10]
  const branch = EARTHLY_BRANCHES[index % 12]
  if (stem === undefined || branch === undefined) throw new Error(`간지를 만들 수 없다: ${value}`)
  return { stem, branch, index }
}

// 천간 번호(0~9)와 지지 번호(0~11)로 60갑자를 만든다. 둘의 홀짝이 다르면 그런 간지는 없다.
export function pillarFromStemBranch(stemIndex: number, branchIndex: number): Pillar {
  for (let index = 0; index < 60; index++) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) return pillarFromIndex(index)
  }
  throw new RangeError(`천간 ${stemIndex}과 지지 ${branchIndex}는 짝이 되지 않는다`)
}
