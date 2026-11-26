// VSOP87D 지구 파일에서 태양 황경 계산에 쓸 항을 골라 소스 데이터 파일로 바꾼다.
// 입출력 없이 데이터만 다루는 순수 함수라서 네트워크나 원본 파일 없이 단위 테스트로 검증한다.

// [진폭 A, 위상 B, 진동수 C]. 한 항은 A * cos(B + C * 천년 단위 시간)이다.
export type Vsop87Term = readonly [number, number, number]

// 지구의 일심 황경(VARIABLE 1)의 T**0 ~ T**5 계열.
export type EarthLongitudeSeries = readonly (readonly Vsop87Term[])[]

const POWERS = 6

export function parseEarthLongitude(text: string): EarthLongitudeSeries {
  const powers: Vsop87Term[][] = Array.from({ length: POWERS }, () => [])
  let current: Vsop87Term[] | undefined
  let expected = 0
  const expectedCounts: number[] = []

  for (const line of text.split(/\r?\n/)) {
    const header = /VARIABLE (\d) \(LBR\)\s+\*T\*\*(\d)\s+(\d+) TERMS/.exec(line)
    if (header !== null) {
      const [, variable, power, count] = header
      current = variable === '1' ? powers[Number(power)] : undefined
      if (current !== undefined) expectedCounts[Number(power)] = Number(count)
      expected = Number(count)
      continue
    }
    if (current === undefined || line.trim() === '') continue
    // 항 한 줄은 앞쪽에 계수들이 있고 맨 끝 세 숫자가 진폭, 위상, 진동수다.
    const numbers = line.trim().split(/\s+/).slice(-3).map(Number)
    const [amplitude, phase, frequency] = numbers
    if (
      numbers.length !== 3 ||
      amplitude === undefined ||
      phase === undefined ||
      frequency === undefined ||
      numbers.some((value) => !Number.isFinite(value))
    ) {
      throw new Error(`항을 읽을 수 없다: ${line.trim()}`)
    }
    current.push([amplitude, phase, frequency])
    if (current.length > expected) throw new Error('헤더에 적힌 항 개수보다 많다')
  }

  for (let power = 0; power < POWERS; power++) {
    if (powers[power]?.length !== expectedCounts[power]) {
      throw new Error(`T**${power} 계열의 항 개수가 헤더와 다르다`)
    }
  }
  return powers
}

// 진폭이 threshold 이상인 항만 남긴다.
export function truncate(series: EarthLongitudeSeries, threshold: number): EarthLongitudeSeries {
  return series.map((terms) => terms.filter(([amplitude]) => amplitude >= threshold))
}

export function formatEarthLongitudeFile(series: EarthLongitudeSeries, threshold: number): string {
  const count = series.reduce((sum, terms) => sum + terms.length, 0)
  const blocks = series.map(
    (terms) => `  [\n${terms.map(([a, b, c]) => `    [${a}, ${b}, ${c}],`).join('\n')}\n  ],`,
  )
  return [
    '// 이 파일은 scripts/extract-vsop87.ts가 만든다. 직접 고치지 않는다.',
    '// 출처: VSOP87 (버전 D, 지구, 변수 1: 일심 황경, 황도와 평균 춘분점 기준). IMCCE 배포.',
    '//   P. Bretagnon, G. Francou, "Planetary theories in rectangular and spherical variables.',
    '//   VSOP87 solutions", Astronomy & Astrophysics 202, 309-315 (1988)',
    `// 원본의 T**0~T**5 계열에서 진폭이 ${threshold} 이상인 항 ${count}개만 남겼다.`,
    '// 한 항은 [진폭 A, 위상 B, 진동수 C]이고, 값은 A * cos(B + C * τ)다. τ는 J2000부터의 율리우스 천년 수다.',
    'export const EARTH_LONGITUDE_SERIES: readonly (readonly (readonly [number, number, number])[])[] = [',
    ...blocks,
    ']',
    '',
  ].join('\n')
}
