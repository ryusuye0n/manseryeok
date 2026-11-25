// 패키지 검사 실행기. 런타임 의존성이 없는지, 배포될 파일이 맞는지 확인한다.
// 빌드가 끝난 뒤에 실행한다. (dist가 있어야 배포 파일 검사가 통과한다)

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkPackedFiles, findRuntimeDependencies } from './package-rules.ts'

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, unknown>

// npm은 윈도우에서 .cmd 파일이라 셸을 거쳐야 실행된다. 인자가 고정된 명령 문자열이라 안전하다.
const packed = execSync('npm pack --dry-run --json', { encoding: 'utf8' })
const [result] = JSON.parse(packed) as { files: { path: string }[] }[]
const paths = (result?.files ?? []).map((file) => file.path)

const problems = [...findRuntimeDependencies(pkg), ...checkPackedFiles(paths)]

console.log(`배포 파일 ${paths.length}개: ${paths.join(', ')}`)
if (problems.length === 0) {
  console.log('패키지 검사 통과')
} else {
  for (const problem of problems) {
    console.log(`- ${problem}`)
    console.log(`::error title=패키지 검사::${problem}`)
  }
  process.exitCode = 1
}
