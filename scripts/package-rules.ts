// 패키지 구성이 규칙을 지키는지 판단한다. 입출력 없는 순수 함수라서 단위 테스트로 검증한다.

const RUNTIME_FIELDS = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'bundledDependencies',
] as const

export function findRuntimeDependencies(pkg: Record<string, unknown>): string[] {
  const problems: string[] = []
  for (const field of RUNTIME_FIELDS) {
    const value = pkg[field]
    if (value === undefined) continue
    let names: string[] = []
    if (Array.isArray(value)) names = value.map(String)
    else if (typeof value === 'object' && value !== null) names = Object.keys(value)
    if (names.length > 0) problems.push(`${field}에 런타임 의존성이 있다: ${names.join(', ')}`)
  }
  return problems
}

const REQUIRED_FILES = ['package.json', 'dist/index.js', 'dist/index.d.ts']
const OPTIONAL_ROOT_FILE = /^(README|LICENSE|CHANGELOG)(\.[a-z]+)?$/i

export function checkPackedFiles(paths: readonly string[]): string[] {
  const problems: string[] = []
  for (const required of REQUIRED_FILES) {
    if (!paths.includes(required)) problems.push(`배포 파일에 ${required}가 없다`)
  }
  for (const path of paths) {
    const allowed =
      path === 'package.json' || OPTIONAL_ROOT_FILE.test(path) || path.startsWith('dist/')
    if (!allowed) problems.push(`배포 파일에 들어가면 안 되는 파일이 있다: ${path}`)
  }
  return problems
}
