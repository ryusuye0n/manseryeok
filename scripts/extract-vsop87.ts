// VSOP87D.ear 파일에서 src/data/earth-longitude.generated.ts를 만든다.
//
//   node scripts/extract-vsop87.ts <VSOP87D.ear 경로> [--threshold 1e-7] [--out 경로]
//
// 원본은 IMCCE가 배포한다: ftp://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87D.ear (약 325KB)
// 원본 파일은 저장소에 넣지 않는다. 필요한 항만 골라 만든 데이터 파일만 저장소에 둔다.

import { readFileSync, writeFileSync } from 'node:fs'
import { formatEarthLongitudeFile, parseEarthLongitude, truncate } from './vsop87-data.ts'

const args = process.argv.slice(2)
const input = args[0]
if (input === undefined || input.startsWith('--')) {
  console.error(
    '사용법: node scripts/extract-vsop87.ts <VSOP87D.ear 경로> [--threshold 1e-7] [--out 경로]',
  )
  process.exit(2)
}

let threshold = 1e-7
let out = 'src/data/earth-longitude.generated.ts'
for (let index = 1; index < args.length; index += 2) {
  const value = args[index + 1]
  if (value === undefined) throw new Error(`${args[index]}에 값이 필요하다`)
  if (args[index] === '--threshold') threshold = Number(value)
  else if (args[index] === '--out') out = value
  else throw new Error(`알 수 없는 인자: ${args[index]}`)
}
if (!(threshold > 0)) throw new Error('--threshold는 0보다 큰 수여야 한다')

const series = truncate(parseEarthLongitude(readFileSync(input, 'utf8')), threshold)
writeFileSync(out, formatEarthLongitudeFile(series, threshold))
console.log(`항 ${series.reduce((sum, terms) => sum + terms.length, 0)}개를 ${out}에 썼다`)
