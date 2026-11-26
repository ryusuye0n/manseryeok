import { assertCivilDateTime, type CivilDateTime } from './civil-date-time'
import { SOLAR_TERM_DATA } from './data/solar-terms.generated'
import { calculateSolarTermTimes, SOLAR_TERM_CALCULATION_YEARS } from './solar-term-calculation'
import { SOLAR_TERM_LONGITUDES, SOLAR_TERM_NAMES, type SolarTermName } from './solar-term-names'

export interface SolarTerm extends CivilDateTime {
  name: SolarTermName
  // 태양황경(도). 소한 285도에서 15도씩 늘어 동지 270도로 끝난다.
  longitude: number
  // 'table'은 한국천문연구원 표, 'calculated'는 태양 황경으로 계산한 값이다.
  // 계산값은 1920~2028년 표와 비교해 분 단위로 1분쯤 어긋났다. 표 밖의 미래(2029년 이후)는
  // 지구 자전 보정값(ΔT)을 예측해야 해서 몇 분까지 어긋날 수 있고, 먼 해일수록 불확실하다.
  source: 'table' | 'calculated'
}

export interface SolarTermPeriod {
  // 주어진 시각이 속한 절기. 절기 시각이 되는 순간부터 다음 절기 직전까지 그 절기다.
  current: SolarTerm
  next: SolarTerm
}

const years = Object.keys(SOLAR_TERM_DATA).map(Number)

export const SOLAR_TERM_YEARS: { readonly first: number; readonly last: number } = Object.freeze({
  first: Math.min(...years),
  last: Math.max(...years),
})

// 표나 계산으로 절기를 알 수 있는 연도. 표 범위를 포함한다.
export const SOLAR_TERM_SUPPORTED_YEARS: { readonly first: number; readonly last: number } =
  Object.freeze({
    first: SOLAR_TERM_CALCULATION_YEARS.first,
    last: SOLAR_TERM_CALCULATION_YEARS.last,
  })

const isSupportedYear = (year: number): boolean =>
  Number.isInteger(year) &&
  year >= SOLAR_TERM_SUPPORTED_YEARS.first &&
  year <= SOLAR_TERM_SUPPORTED_YEARS.last

const pad = (value: number): string => String(value).padStart(2, '0')

const format = (at: CivilDateTime): string =>
  `${at.year}-${pad(at.month)}-${pad(at.day)} ${pad(at.hour)}:${pad(at.minute)}`

// 시각 순서를 비교하려고 yyyymmddhhmm 숫자로 바꾼다.
const toKey = (at: CivilDateTime): number =>
  (((at.year * 100 + at.month) * 100 + at.day) * 100 + at.hour) * 100 + at.minute

function parseTerm(year: number, index: number, text: string): SolarTerm {
  const name = SOLAR_TERM_NAMES[index]
  const longitude = SOLAR_TERM_LONGITUDES[index]
  if (name === undefined || longitude === undefined) {
    throw new Error(`절기 번호가 올바르지 않다: ${index}`)
  }
  return {
    name,
    longitude,
    source: 'table',
    year,
    month: Number(text.slice(0, 2)),
    day: Number(text.slice(2, 4)),
    hour: Number(text.slice(4, 6)),
    minute: Number(text.slice(6, 8)),
  }
}

// 계산은 비싸서(절기 24개마다 수백 번의 삼각함수) 연도별로 한 번만 하고 저장해 둔다.
// 저장한 값은 돌려주기 전에 새 객체로 복사해서, 받은 쪽이 바꿔도 저장값이 달라지지 않는다.
const calculatedCache = new Map<number, readonly CivilDateTime[]>()

function calculatedTimes(year: number): CivilDateTime[] {
  let times = calculatedCache.get(year)
  if (times === undefined) {
    times = calculateSolarTermTimes(year)
    calculatedCache.set(year, times)
  }
  return times.map((time) => ({ ...time }))
}

// 연도마다 24절기를 소한부터 동지까지 시각 순서로 돌려준다.
// 표가 있는 연도(SOLAR_TERM_YEARS)는 표 값을, 그 밖의 SOLAR_TERM_SUPPORTED_YEARS는 계산값을 쓴다.
export function getSolarTerms(year: number): SolarTerm[] {
  const row = Number.isInteger(year) ? SOLAR_TERM_DATA[year] : undefined
  if (row !== undefined) return row.map((text, index) => parseTerm(year, index, text))
  if (!isSupportedYear(year)) {
    throw new RangeError(
      `지원하는 연도는 ${SOLAR_TERM_SUPPORTED_YEARS.first}~${SOLAR_TERM_SUPPORTED_YEARS.last}년이다: ${year}`,
    )
  }
  return calculatedTimes(year).map((time, index) => {
    const name = SOLAR_TERM_NAMES[index]
    const longitude = SOLAR_TERM_LONGITUDES[index]
    if (name === undefined || longitude === undefined) {
      throw new Error(`절기 번호가 올바르지 않다: ${index}`)
    }
    return { name, longitude, source: 'calculated', ...time }
  })
}

// 주어진 시각이 속한 절기와 다음 절기를 돌려준다.
// 입력은 서머타임을 뺀 UTC+9 표준시여야 한다. 벽시계 시각을 그대로 넣으면 서머타임과
// UTC+8:30 시기에 절기 경계 근처에서 틀린 절기가 나온다. (toKoreaStandardTime으로 바꾼 뒤 넣는다. CivilDateTime 설명 참고)
// 앞뒤 절기를 알 수 없으면(1900년 첫 소한 전, 2150년 마지막 동지 이후) RangeError를 낸다.
export function getSolarTermPeriod(at: CivilDateTime): SolarTermPeriod {
  assertCivilDateTime(at)
  const around = [at.year - 1, at.year, at.year + 1].flatMap((year) =>
    isSupportedYear(year) ? getSolarTerms(year) : [],
  )
  const key = toKey(at)
  const nextIndex = around.findIndex((term) => toKey(term) > key)
  const next = nextIndex === -1 ? undefined : around[nextIndex]
  const current = nextIndex === -1 ? around[around.length - 1] : around[nextIndex - 1]
  if (current === undefined || next === undefined) {
    throw new RangeError(`절기 구간을 알 수 없는 시각이다 (지원 범위 밖): ${format(at)}`)
  }
  return { current, next }
}
