import { SOLAR_TERM_DATA } from './data/solar-terms.generated'
import { SOLAR_TERM_LONGITUDES, SOLAR_TERM_NAMES, type SolarTermName } from './solar-term-names'

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

export interface SolarTerm extends CivilDateTime {
  name: SolarTermName
  // 태양황경(도). 소한 285도에서 15도씩 늘어 동지 270도로 끝난다.
  longitude: number
}

export interface SolarTermPeriod {
  // 주어진 시각이 속한 절기. 절기 시각이 되는 순간부터 다음 절기 직전까지 그 절기다.
  current: SolarTerm
  next: SolarTerm
}

const years = Object.keys(SOLAR_TERM_DATA).map(Number)

export const SOLAR_TERM_YEARS: { readonly first: number; readonly last: number } = {
  first: Math.min(...years),
  last: Math.max(...years),
}

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
    year,
    month: Number(text.slice(0, 2)),
    day: Number(text.slice(2, 4)),
    hour: Number(text.slice(4, 6)),
    minute: Number(text.slice(6, 8)),
  }
}

// 한 해의 24절기를 소한부터 동지까지 시각 순서로 돌려준다.
export function getSolarTerms(year: number): SolarTerm[] {
  const row = Number.isInteger(year) ? SOLAR_TERM_DATA[year] : undefined
  if (row === undefined) {
    throw new RangeError(
      `지원하는 연도는 ${SOLAR_TERM_YEARS.first}~${SOLAR_TERM_YEARS.last}년이다: ${year}`,
    )
  }
  return row.map((text, index) => parseTerm(year, index, text))
}

function assertCivilDateTime(at: CivilDateTime): void {
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

// 주어진 시각이 속한 절기와 다음 절기를 돌려준다.
// 입력은 서머타임을 뺀 UTC+9 표준시여야 한다. 벽시계 시각을 그대로 넣으면 서머타임과
// UTC+8:30 시기에 절기 경계 근처에서 틀린 절기가 나온다. (CivilDateTime 설명 참고)
// 앞뒤 절기 중 하나라도 표에 없으면(1920년 첫 소한 전, 2028년 마지막 동지 이후) RangeError를 낸다.
export function getSolarTermPeriod(at: CivilDateTime): SolarTermPeriod {
  assertCivilDateTime(at)
  const around = [at.year - 1, at.year, at.year + 1].flatMap((year) =>
    SOLAR_TERM_DATA[year] === undefined ? [] : getSolarTerms(year),
  )
  const key = toKey(at)
  const nextIndex = around.findIndex((term) => toKey(term) > key)
  const next = nextIndex === -1 ? undefined : around[nextIndex]
  const current = nextIndex === -1 ? around[around.length - 1] : around[nextIndex - 1]
  if (current === undefined || next === undefined) {
    throw new RangeError(`절기 구간을 알 수 없는 시각이다 (표의 범위 밖): ${format(at)}`)
  }
  return { current, next }
}
