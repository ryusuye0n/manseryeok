// 한국천문연구원 24절기 API에서 표를 받아 src/data/solar-terms.generated.ts를 만든다.
//
//   npm run fetch:solar-terms
//   node --env-file=.env scripts/fetch-solar-terms.ts --from 1920 --to 2028 --out 경로
//
// 인증키는 .env의 KASI_SERVICE_KEY에서만 읽고, 화면에 출력하지 않으며 저장소에도 올리지 않는다.
// 검증을 통과하지 못한 연도가 하나라도 있으면 파일을 쓰지 않는다.

import { writeFileSync } from 'node:fs'
import { type ApiItem, formatDataFile, toYearRow } from './solar-term-data.ts'

const ENDPOINT =
  'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo'

const rawKey = process.env.KASI_SERVICE_KEY?.trim()
if (rawKey === undefined || rawKey === '') {
  console.error('KASI_SERVICE_KEY가 없다. .env에 적고 `npm run fetch:solar-terms`로 실행한다.')
  process.exit(2)
}
// Encoding 키든 Decoding 키든 받아서 한 번만 인코딩해 쓴다.
const key = rawKey.includes('%') ? decodeURIComponent(rawKey) : rawKey
const mask = (text: string): string =>
  text
    .replaceAll(encodeURIComponent(key), '[키]')
    .replaceAll(key, '[키]')
    .replaceAll(rawKey, '[키]')

function parseArgs(args: readonly string[]): { from: number; to: number; out: string } {
  const options = { from: 1920, to: 2028, out: 'src/data/solar-terms.generated.ts' }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    const value = args[++index]
    if (value === undefined) throw new Error(`${arg}에 값이 필요하다`)
    if (arg === '--from') options.from = Number(value)
    else if (arg === '--to') options.to = Number(value)
    else if (arg === '--out') options.out = value
    else throw new Error(`알 수 없는 인자: ${arg}`)
  }
  if (
    !Number.isInteger(options.from) ||
    !Number.isInteger(options.to) ||
    options.from > options.to
  ) {
    throw new Error('--from과 --to는 from <= to인 정수여야 한다')
  }
  return options
}

async function fetchYear(year: number): Promise<ApiItem[]> {
  const url = `${ENDPOINT}?solYear=${year}&numOfRows=50&_type=json&ServiceKey=${encodeURIComponent(key)}`
  let lastError = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const json = (await response.json()) as {
        response?: {
          header?: { resultCode?: string; resultMsg?: string }
          body?: { items?: { item?: ApiItem | ApiItem[] } | '' }
        }
      }
      const header = json.response?.header
      if (header?.resultCode !== '00') {
        throw new Error(`결과코드 ${header?.resultCode}: ${header?.resultMsg}`)
      }
      const items = json.response?.body?.items
      const item = items === '' || items === undefined ? undefined : items.item
      return Array.isArray(item) ? item : item === undefined ? [] : [item]
    } catch (error) {
      lastError = mask(error instanceof Error ? error.message : String(error))
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error(`${year}년 조회에 3번 실패했다: ${lastError}`)
}

const { from, to, out } = parseArgs(process.argv.slice(2))
const rows = new Map<number, string[]>()
const problems: string[] = []

for (let year = from; year <= to; year++) {
  const result = toYearRow(year, await fetchYear(year))
  problems.push(...result.problems)
  rows.set(year, result.terms)
  await new Promise((resolve) => setTimeout(resolve, 60))
}

if (problems.length > 0) {
  console.error(`검증에 실패했다. 파일을 쓰지 않는다. (${problems.length}건)`)
  for (const problem of problems.slice(0, 20)) console.error(`- ${mask(problem)}`)
  process.exit(1)
}

writeFileSync(out, formatDataFile(rows))
console.log(`${rows.size}개 연도(${from}~${to}), 절기 ${rows.size * 24}개를 ${out}에 썼다`)
