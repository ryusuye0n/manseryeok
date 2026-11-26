import { describe, expect, it } from 'vitest'
import { type ApiItem, formatDataFile, toYearRow } from '../scripts/solar-term-data'
import { SOLAR_TERM_LONGITUDES, SOLAR_TERM_NAMES } from '../src/solar-term-names'

const pad = (value: number): string => String(value).padStart(2, '0')

// 날짜는 만든 값이고 실제 절기 시각이 아니다. 검증 규칙만 확인하려는 입력이다.
const items = (year = 2024): ApiItem[] =>
  SOLAR_TERM_NAMES.map((name, index) => ({
    dateName: name,
    locdate: Number(`${year}${pad(Math.floor(index / 2) + 1)}${index % 2 === 0 ? '05' : '20'}`),
    kst: '1200      ',
    sunLongitude: SOLAR_TERM_LONGITUDES[index],
  }))

const withChange = (index: number, change: Partial<ApiItem>, year = 2024): ApiItem[] =>
  items(year).map((item, position) => (position === index ? { ...item, ...change } : item))

describe('toYearRow', () => {
  it('올바른 응답은 24개 항목과 문제 없음을 돌려준다', () => {
    const row = toYearRow(2024, items())
    expect(row.problems).toEqual([])
    expect(row.terms).toHaveLength(24)
    expect(row.terms[0]).toBe('01051200')
    expect(row.terms[23]).toBe('12201200')
  })

  it('시각 뒤의 공백을 없앤다', () => {
    expect(toYearRow(2024, withChange(2, { kst: '1727      ' })).terms[2]).toBe('02051727')
  })

  it('태양황경이 없는 응답도 이름 순서가 맞으면 통과한다', () => {
    const noLongitude = items().map(({ sunLongitude: _removed, ...rest }) => rest)
    expect(toYearRow(2024, noLongitude).problems).toEqual([])
  })

  it('응답 순서가 뒤섞여 있어도 시각 순서로 정렬한다', () => {
    const row = toYearRow(2024, [...items()].reverse())
    expect(row.problems).toEqual([])
    expect(row.terms[0]).toBe('01051200')
  })

  it.each([
    ['23개', items().slice(0, 23)],
    ['25개', [...items(), ...items().slice(0, 1)]],
  ])('절기가 %s이면 문제를 알린다', (_name, input) => {
    expect(toYearRow(2024, input).problems.some((problem) => problem.includes('24개여야'))).toBe(
      true,
    )
  })

  it('이름이 순서와 다르면 몇 번째인지 알려 준다', () => {
    const problems = toYearRow(2024, withChange(3, { dateName: '경칩' })).problems
    expect(problems.some((problem) => problem.includes('4번째'))).toBe(true)
  })

  it('태양황경이 있는데 기대값과 다르면 문제를 알린다', () => {
    const problems = toYearRow(2024, withChange(2, { sunLongitude: 316 })).problems
    expect(problems.some((problem) => problem.includes('태양황경'))).toBe(true)
  })

  it('다른 해의 날짜가 섞이면 문제를 알린다', () => {
    const problems = toYearRow(2024, withChange(5, { locdate: 20230321 })).problems
    expect(problems.some((problem) => problem.includes('2024년이 아니다'))).toBe(true)
  })

  it('존재하지 않는 날짜면 문제를 알린다', () => {
    const problems = toYearRow(2024, withChange(2, { locdate: 20240230 })).problems
    expect(problems.some((problem) => problem.includes('존재하지 않는'))).toBe(true)
  })

  it.each(['2460', '1260', '12', 'abcd', '', '24:00'])('시각 %j는 형식 문제로 알린다', (kst) => {
    const problems = toYearRow(2024, withChange(2, { kst })).problems
    expect(problems.some((problem) => problem.includes('HHMM'))).toBe(true)
  })

  it('같은 시각이 두 번 나오면 문제를 알린다', () => {
    const problems = toYearRow(2024, withChange(1, { locdate: items()[0]?.locdate ?? 0 })).problems
    expect(problems.some((problem) => problem.includes('이전 절기보다'))).toBe(true)
  })

  describe('원본이 자정을 24:00으로 적은 경우', () => {
    it('다음 날 00:00으로 바꿔서 저장한다', () => {
      const row = toYearRow(2024, withChange(1, { locdate: 20240120, kst: '2400      ' }))
      expect(row.problems).toEqual([])
      expect(row.terms[1]).toBe('01210000')
    })

    it('월말의 24:00은 다음 달 1일 00:00이 된다', () => {
      const row = toYearRow(2024, withChange(22, { locdate: 20240229, kst: '2400' }))
      // 22번째(대설) 항목의 날짜를 2월로 옮겼으므로 순서 문제는 따로 생기지만 변환 자체는 확인한다
      expect(row.terms.includes('03010000')).toBe(true)
    })

    it('24시가 아닌 분(24:30)은 오류다', () => {
      const problems = toYearRow(2024, withChange(1, { kst: '2430' })).problems
      expect(problems.some((problem) => problem.includes('HHMM'))).toBe(true)
    })

    it('해를 넘어가는 24:00은 오류다', () => {
      const problems = toYearRow(2024, withChange(23, { locdate: 20241231, kst: '2400' })).problems
      expect(problems.some((problem) => problem.includes('해를 넘어간다'))).toBe(true)
    })
  })
})

describe('formatDataFile', () => {
  const rows = new Map<number, readonly string[]>([
    [2025, toYearRow(2025, items(2025)).terms],
    [2024, toYearRow(2024, items(2024)).terms],
  ])
  const text = formatDataFile(rows)

  it('출처와 형식을 설명하는 머리말이 있다', () => {
    expect(text).toContain('scripts/fetch-solar-terms.ts가 만든다')
    expect(text).toContain('한국천문연구원_특일 정보')
    expect(text).toContain(
      'export const SOLAR_TERM_DATA: Readonly<Record<number, readonly string[]>> = {',
    )
  })

  it('연도를 작은 것부터 한 줄씩 쓰고 24개 값을 담는다', () => {
    const lines = text.split('\n').filter((line) => /^ {2}\d{4}: \[/.test(line))
    expect(lines).toHaveLength(2)
    expect(lines[0]?.startsWith('  2024: [')).toBe(true)
    expect(lines[1]?.startsWith('  2025: [')).toBe(true)
    for (const line of lines) expect(line.match(/'\d{8}'/g)).toHaveLength(24)
  })

  it('입력한 값을 그대로 담는다', () => {
    const first = text.split('\n').find((line) => line.startsWith('  2024: ['))
    const values = (first?.match(/'(\d{8})'/g) ?? []).map((value) => value.replaceAll("'", ''))
    expect(values).toEqual(rows.get(2024))
  })

  it('줄바꿈으로 끝난다', () => {
    expect(text.endsWith('}\n')).toBe(true)
  })
})
