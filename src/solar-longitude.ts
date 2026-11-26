// 태양의 겉보기 황경을 계산한다.
//
// 출처
// - 지구의 일심 황경: VSOP87 (버전 D). Bretagnon & Francou, Astronomy & Astrophysics 202, 309 (1988).
//   항은 src/data/earth-longitude.generated.ts에 있다.
// - 태양 황경 = 지구 일심 황경 + 180도. 겉보기 값으로 바꾸는 보정(FK5 보정, 장동, 광행차)은
//   Jean Meeus, "Astronomical Algorithms" 2판, 25장과 32장의 절차를 쓴다.
// - 지구시(TT)와 세계시(UT)의 차이 ΔT: Espenak & Meeus 다항식 (NASA "Polynomial Expressions for Delta T").
//
// 정밀도: 한국천문연구원 절기 표(1920~2028년)와 비교해 초 단위 오차가 분 단위 반올림 수준이다.

import { EARTH_LONGITUDE_SERIES } from './data/earth-longitude.generated'

const DEGREES = Math.PI / 180

// 율리우스 적일(JD)에서 1970-01-01 00:00 UTC까지의 차이
const UNIX_EPOCH_JD = 2440587.5
const MS_PER_DAY = 86_400_000

export const SOLAR_LONGITUDE_YEARS: { readonly first: number; readonly last: number } =
  Object.freeze({ first: 1900, last: 2150 })

// 지구시(TT)와 세계시(UT)의 차이(초). 1900년 1월 1일부터 2150년 12월 31일까지만 지원한다.
// year는 소수 연도다. 다항식은 year + (월 - 0.5) / 12 같은 값을 넣는 식이다.
export function deltaT(year: number): number {
  if (year < SOLAR_LONGITUDE_YEARS.first || year >= SOLAR_LONGITUDE_YEARS.last + 1) {
    throw new RangeError(
      `계산할 수 있는 연도는 ${SOLAR_LONGITUDE_YEARS.first}~${SOLAR_LONGITUDE_YEARS.last}년이다: ${year}`,
    )
  }
  if (year < 1920) {
    const t = year - 1900
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4
  }
  if (year < 1941) {
    const t = year - 1920
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3
  }
  if (year < 1961) {
    const t = year - 1950
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547
  }
  if (year < 1986) {
    const t = year - 1975
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718
  }
  if (year < 2005) {
    const t = year - 2000
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    )
  }
  if (year < 2050) {
    const t = year - 2000
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2
  }
  return -20 + 32 * ((year - 1820) / 100) ** 2 - 0.5628 * (2150 - year)
}

// 지구시 기준 율리우스 적일(JDE)에서의 태양 겉보기 황경(도, 0 이상 360 미만)
export function apparentSolarLongitude(jde: number): number {
  const millennia = (jde - 2451545) / 365250
  const centuries = millennia * 10

  // 지구의 일심 황경(라디안). T**n 계열마다 천년 수의 n제곱을 곱해 더한다.
  let earthLongitude = 0
  let power = 1
  for (const terms of EARTH_LONGITUDE_SERIES) {
    let sum = 0
    for (const [amplitude, phase, frequency] of terms) {
      sum += amplitude * Math.cos(phase + frequency * millennia)
    }
    earthLongitude += sum * power
    power *= millennia
  }

  // 장동(황경 성분, 각초): 가장 큰 4개 항
  const node = (125.04452 - 1934.136261 * centuries) * DEGREES
  const sunMean = (280.4665 + 36000.7698 * centuries) * DEGREES
  const moonMean = (218.3165 + 481267.8813 * centuries) * DEGREES
  const nutation =
    -17.2 * Math.sin(node) -
    1.32 * Math.sin(2 * sunMean) -
    0.23 * Math.sin(2 * moonMean) +
    0.21 * Math.sin(2 * node)

  // 광행차(각초). 지구와 태양 사이 거리 R(천문단위)은 타원 궤도 근사식을 쓴다.
  const anomaly = (357.52911 + 35999.05029 * centuries) * DEGREES
  const eccentricity = 0.016708634 - 0.000042037 * centuries
  const center = (1.914602 * Math.sin(anomaly) + 0.019993 * Math.sin(2 * anomaly)) * DEGREES
  const distance =
    (1.000001018 * (1 - eccentricity ** 2)) / (1 + eccentricity * Math.cos(anomaly + center))
  const aberration = -20.4898 / distance

  // VSOP87에서 FK5 기준틀로 바꾸는 보정은 -0.09033각초다.
  const arcseconds = -0.09033 + nutation + aberration
  const degrees = earthLongitude / DEGREES + 180 + arcseconds / 3600
  return ((degrees % 360) + 360) % 360
}

// 태양 황경이 target도가 되는 순간을 UTC 밀리초(Unix 시각)로 돌려준다.
// guess는 그 순간 근처의 Unix 시각(밀리초)이다.
export function solveSolarLongitude(target: number, guessUnixMs: number): number {
  // ΔT는 해마다 몇 초씩 변하므로 추정 시각의 월까지 반영한 소수 연도로 구한다.
  const guess = new Date(guessUnixMs)
  const deltaDays = deltaT(guess.getUTCFullYear() + (guess.getUTCMonth() + 0.5) / 12) / 86_400
  let jde = guessUnixMs / MS_PER_DAY + UNIX_EPOCH_JD + deltaDays
  // 태양은 하루에 약 0.9856도 움직인다. 뉴턴법으로 몇 번 되풀이하면 충분히 수렴한다.
  for (let step = 0; step < 8; step++) {
    const difference = ((target - apparentSolarLongitude(jde) + 540) % 360) - 180
    jde += difference / 0.9856
  }
  return (jde - deltaDays - UNIX_EPOCH_JD) * MS_PER_DAY
}
