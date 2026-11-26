// 한국천문연구원 24절기 응답을 검증하고 소스 데이터 파일로 바꾼다.
// 입출력 없이 데이터만 다루는 순수 함수라서 네트워크 없이 단위 테스트로 검증한다.

import { SOLAR_TERM_LONGITUDES, SOLAR_TERM_NAMES } from '../src/solar-term-names.ts'

export interface ApiItem {
  dateName: string
  locdate: number
  kst: string
  // 응답에 있는 해(2004~2024년)도 있고 없는 해(그 밖의 해)도 있다. 있으면 검증하고 없으면 건너뛴다.
  sunLongitude?: number
}

export interface YearRow {
  // 소한부터 동지까지 24개. 각 항목은 "MMDDHHmm" (한국 표준시, 분 단위)
  terms: string[]
  problems: string[]
  // 원본이 24:00으로 적어 다음 날 00:00으로 바꾼 절기. 예: "1950년 대한"
  adjusted: string[]
}

const pad = (value: number): string => String(value).padStart(2, '0')

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

export function toYearRow(year: number, items: readonly ApiItem[]): YearRow {
  const problems: string[] = []
  if (items.length !== 24) problems.push(`${year}년: 절기가 ${items.length}개다. 24개여야 한다`)

  const sorted = [...items].sort(
    (a, b) => a.locdate - b.locdate || a.kst.trim().localeCompare(b.kst.trim()),
  )
  const terms: string[] = []
  const adjusted: string[] = []
  let previous = ''

  for (const [index, item] of sorted.entries()) {
    const label = `${year}년 ${item.dateName}`
    let date = String(item.locdate)
    let time = item.kst.trim()

    let dateOk = /^\d{8}$/.test(date) && Number(date.slice(0, 4)) === year
    if (!dateOk) {
      problems.push(`${label}: 날짜가 ${year}년이 아니다 (${date})`)
    } else if (!isValidDate(year, Number(date.slice(4, 6)), Number(date.slice(6, 8)))) {
      dateOk = false
      problems.push(`${label}: 존재하지 않는 날짜다 (${date})`)
    }

    const timeOk =
      /^\d{4}$/.test(time) &&
      Number(time.slice(2)) <= 59 &&
      (Number(time.slice(0, 2)) <= 23 || time === '2400')
    if (!timeOk) {
      problems.push(`${label}: 시각이 HHMM 형식이 아니다 (${JSON.stringify(item.kst)})`)
    } else if (time === '2400' && dateOk) {
      // 원본은 자정을 "전날 24:00"으로 적는다. 같은 순간인 다음 날 00:00으로 바꿔 저장한다.
      const next = new Date(
        Date.UTC(year, Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)) + 1),
      )
      if (next.getUTCFullYear() !== year) {
        problems.push(`${label}: 24:00이 해를 넘어간다 (${date})`)
      } else {
        date = `${year}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`
        time = '0000'
        adjusted.push(label)
      }
    }

    if (index >= SOLAR_TERM_NAMES.length) {
      problems.push(`${label}: ${index + 1}번째 남는 항목이다`)
    } else {
      if (item.dateName !== SOLAR_TERM_NAMES[index]) {
        problems.push(`${label}: ${index + 1}번째 절기는 ${SOLAR_TERM_NAMES[index]}이어야 한다`)
      }
      if (item.sunLongitude !== undefined && item.sunLongitude !== SOLAR_TERM_LONGITUDES[index]) {
        problems.push(
          `${label}: 태양황경이 ${item.sunLongitude}도다. ${SOLAR_TERM_LONGITUDES[index]}도여야 한다`,
        )
      }
    }
    const stamp = `${date}${time}`
    if (previous !== '' && stamp <= previous) {
      problems.push(`${label}: 이전 절기보다 늦은 시각이 아니다`)
    }
    previous = stamp
    terms.push(`${date.slice(4)}${time}`)
  }
  return { terms, problems, adjusted }
}

export function formatDataFile(
  rows: ReadonlyMap<number, readonly string[]>,
  adjusted: readonly string[] = [],
): string {
  const years = [...rows.keys()].sort((a, b) => a - b)
  const lines = years.map((year) => {
    const terms = (rows.get(year) ?? []).map((term) => `'${term}'`).join(', ')
    return `  ${year}: [${terms}],`
  })
  return [
    '// 이 파일은 scripts/fetch-solar-terms.ts가 만든다. 직접 고치지 않는다.',
    '// 출처: 공공데이터포털 한국천문연구원_특일 정보 (24절기 정보 조회), 이용허락범위 제한 없음',
    '// 형식: 연도 -> 소한부터 동지까지 24개. 각 항목은 "MMDDHHmm" (한국 표준시, 분 단위)',
    ...(adjusted.length === 0
      ? []
      : [
          `// 원본이 자정을 전날 24:00으로 적은 경우는 다음 날 00:00으로 바꿔 저장했다: ${adjusted.join(', ')}`,
        ]),
    'export const SOLAR_TERM_DATA: Readonly<Record<number, readonly string[]>> = {',
    ...lines,
    '}',
    '',
  ].join('\n')
}
