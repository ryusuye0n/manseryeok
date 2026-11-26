import { describe, expect, it } from 'vitest'
import { checkPackedFiles, findRuntimeDependencies } from '../scripts/package-rules'

describe('findRuntimeDependencies', () => {
  it('의존성이 없으면 통과한다', () => {
    expect(findRuntimeDependencies({ name: 'x' })).toEqual([])
  })

  it('개발 의존성은 런타임 의존성으로 보지 않는다', () => {
    expect(findRuntimeDependencies({ devDependencies: { vitest: '^5.0.0' } })).toEqual([])
  })

  it('빈 dependencies는 통과한다', () => {
    expect(findRuntimeDependencies({ dependencies: {} })).toEqual([])
  })

  it.each(['dependencies', 'optionalDependencies', 'peerDependencies'])(
    '%s에 항목이 있으면 이름을 알려 준다',
    (field) => {
      const problems = findRuntimeDependencies({ [field]: { 'left-pad': '^1.0.0' } })
      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain(field)
      expect(problems[0]).toContain('left-pad')
    },
  )

  it('bundledDependencies 배열도 잡는다', () => {
    expect(findRuntimeDependencies({ bundledDependencies: ['a', 'b'] })).toHaveLength(1)
  })

  it('여러 필드에 있으면 모두 알려 준다', () => {
    const problems = findRuntimeDependencies({
      dependencies: { a: '1' },
      peerDependencies: { b: '1' },
    })
    expect(problems).toHaveLength(2)
  })
})

describe('checkPackedFiles', () => {
  const good = ['package.json', 'dist/index.js', 'dist/index.d.ts']

  it('필수 파일만 있으면 통과한다', () => {
    expect(checkPackedFiles(good)).toEqual([])
  })

  it('소스맵과 README, LICENSE는 허용한다', () => {
    expect(
      checkPackedFiles([...good, 'dist/index.js.map', 'README.md', 'LICENSE', 'CHANGELOG.md']),
    ).toEqual([])
  })

  it.each(['dist/index.js', 'dist/index.d.ts', 'package.json'])(
    '%s가 빠지면 실패한다',
    (missing) => {
      const problems = checkPackedFiles(good.filter((path) => path !== missing))
      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain(missing)
    },
  )

  it.each(['src/index.ts', 'test/smoke.test.ts', '.claude/settings.json', 'CLAUDE.md', '.env'])(
    '%s가 들어 있으면 실패한다',
    (stray) => {
      const problems = checkPackedFiles([...good, stray])
      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain(stray)
    },
  )
})
