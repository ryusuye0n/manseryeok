import { describe, expect, it } from 'vitest'
import {
  checkBody,
  checkBranch,
  checkCommit,
  checkTitle,
  type ParsedTitle,
  parseTitle,
} from '../scripts/pr-rules'

const title = (type: ParsedTitle['type'], issue: number): ParsedTitle => ({
  type,
  description: '설명',
  issue,
})

describe('parseTitle', () => {
  it('제목을 type, 설명, 이슈 번호로 나눈다', () => {
    expect(parseTitle('[feat] 대운 계산 추가 - #12')).toEqual({
      type: 'feat',
      description: '대운 계산 추가',
      issue: 12,
    })
  })

  it('설명에 " - "가 들어 있어도 마지막 " - #번호"만 이슈 번호로 본다', () => {
    expect(parseTitle('[docs] 절기 - 입춘 정리 - #7')).toEqual({
      type: 'docs',
      description: '절기 - 입춘 정리',
      issue: 7,
    })
  })

  it.each([
    ['커밋 형식', 'feat: 대운 계산 추가'],
    ['모르는 type', '[feature] 대운 계산 추가 - #1'],
    ['대문자 type', '[Feat] 대운 계산 추가 - #1'],
    ['이슈 번호 없음', '[feat] 대운 계산 추가'],
    ['이슈 번호 0', '[feat] 대운 계산 추가 - #0'],
    ['앞에 0이 붙은 번호', '[feat] 대운 계산 추가 - #01'],
    ['type 뒤 공백 없음', '[feat]대운 계산 추가 - #1'],
    ['대시 앞 공백 없음', '[feat] 대운 계산 추가- #1'],
    ['앞 공백', ' [feat] 대운 계산 추가 - #1'],
    ['뒤 공백', '[feat] 대운 계산 추가 - #1 '],
    ['빈 설명', '[feat]  - #1'],
    ['빈 문자열', ''],
  ])('형식이 아니면 null을 돌려준다: %s', (_name, input) => {
    expect(parseTitle(input)).toBeNull()
  })
})

describe('checkTitle', () => {
  it.each([
    '[feat] 대운 계산 추가 - #12',
    '[fix] 입춘 직전 연주 오류 수정 - #30',
    '[chore] 하네스 설치와 프로젝트 지침 추가 - #1',
    '[chore] 패키지 뼈대 구성 - #3',
    '[feat] 마이페이지 구현 및 API 연동 - #219',
    '[refactor] tsdown 설정 정리 - #8',
    '[test] 절기 경계 테스트 추가 - #9',
  ])('규칙에 맞는 제목은 통과한다: %s', (input) => {
    expect(checkTitle(input)).toEqual([])
  })

  it('형식이 틀리면 형식 위반 하나를 알려 준다', () => {
    const problems = checkTitle('feat: 대운 계산 추가')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('[type] 설명 - #이슈번호')
  })

  it('설명이 마침표로 끝나면 실패한다', () => {
    expect(checkTitle('[feat] 대운 계산 추가. - #1')).toHaveLength(1)
  })

  it('설명에 한글이 없으면 실패한다', () => {
    const problems = checkTitle('[feat] add daeun calculation - #1')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('한국어')
  })

  it('여러 위반은 모두 알려 준다', () => {
    expect(checkTitle('[feat] add daeun. - #1')).toHaveLength(2)
  })
})

describe('checkBranch', () => {
  it.each([
    ['feat/93-risk-assessment-async-response', title('feat', 93)],
    ['fix/58-revert-assessment-timeout', title('fix', 58)],
    ['chore/5-ci-pr-rules', title('chore', 5)],
    ['docs/7-a', title('docs', 7)],
  ])('규칙에 맞는 브랜치는 통과한다: %s', (branch, parsed) => {
    expect(checkBranch(branch, parsed)).toEqual([])
  })

  it.each([
    ['feature/1-add', '모르는 type'],
    ['feat/add-daeun', '이슈 번호 없음'],
    ['feat/1-', '설명 없음'],
    ['feat/1-Add-Daeun', '대문자'],
    ['feat/01-add', '앞에 0이 붙은 번호'],
    ['feat/1-add_daeun', '밑줄'],
    ['feat/1-add--daeun', '연속된 하이픈'],
    ['feat/1-add-', '끝에 하이픈'],
    ['main', '브랜치 규칙 없음'],
    ['feat/1-add/extra', '슬래시 추가'],
  ])('형식이 아니면 실패한다: %s (%s)', (branch) => {
    expect(checkBranch(branch, null)).toHaveLength(1)
  })

  it('제목을 읽지 못했으면 브랜치 형식만 본다', () => {
    expect(checkBranch('feat/1-add', null)).toEqual([])
  })

  it('브랜치의 type이 제목과 다르면 실패한다', () => {
    const problems = checkBranch('fix/5-add', title('feat', 5))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('type')
  })

  it('브랜치의 이슈 번호가 제목과 다르면 실패한다', () => {
    const problems = checkBranch('feat/6-add', title('feat', 5))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('이슈 번호')
  })

  it('type과 번호가 모두 다르면 둘 다 알려 준다', () => {
    expect(checkBranch('fix/6-add', title('feat', 5))).toHaveLength(2)
  })
})

describe('checkCommit', () => {
  it.each([
    'feat: 대운 계산 추가',
    'chore: tsdown 빌드 설정 추가',
    'test: vitest 설정과 스모크 테스트 추가',
    'docs: PR 제목 형식 수정\n',
    'fix: 입춘 직전 연주 오류 수정\r\n',
    'chore: 레포 초기화',
  ])('규칙에 맞는 커밋은 통과한다: %j', (message) => {
    expect(checkCommit(message)).toEqual([])
  })

  it.each([
    ['모르는 type', 'style: 줄 정리'],
    ['gitmoji 형식', '✨ :: 대운 계산 추가'],
    ['type 없음', '대운 계산 추가'],
    ['콜론 뒤 공백 없음', 'feat:대운 계산 추가'],
    ['대문자 type', 'Feat: 대운 계산 추가'],
    ['머지 커밋 문구', "Merge branch 'main' into feat/1-add"],
  ])('형식이 아니면 실패한다: %s', (_name, message) => {
    expect(checkCommit(message).length).toBeGreaterThan(0)
  })

  it('설명이 마침표로 끝나면 실패한다', () => {
    expect(checkCommit('feat: 대운 계산 추가.')).toHaveLength(1)
  })

  it('설명이 영어뿐이면 실패한다', () => {
    expect(checkCommit('feat: add daeun')).toHaveLength(1)
  })

  it('본문이 있으면 실패한다', () => {
    const problems = checkCommit('feat: 대운 계산 추가\n\n자세한 설명')
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('본문')
  })

  it.each([
    'feat: 대운 계산 추가\n\nCo-Authored-By: Someone <a@example.com>',
    'feat: 대운 계산 추가\n\nco-authored-by: Someone <a@example.com>',
    'feat: 대운 계산 추가\n\nGenerated with Some Tool',
    'feat: 대운 계산 추가\n\n🤖',
  ])('AI 표기가 있으면 실패한다 (표기마다 따로 잡는다): %j', (message) => {
    expect(checkCommit(message).some((problem) => problem.includes('AI'))).toBe(true)
  })
})

const validBody = (issue: number | string = 3): string =>
  [
    '## 📍 개요',
    '> 패키지 뼈대를 구성',
    '',
    '## 🛠️ 작업 내용',
    '- package.json 작성',
    '- tsconfig 설정',
    '',
    '## 📸 결과물',
    '해당 없음',
    '',
    '## 🔗 관련 링크',
    `- 이슈 번호: closes #${issue}`,
    '',
  ].join('\n')

describe('checkBody', () => {
  it('규칙에 맞는 본문은 통과한다', () => {
    expect(checkBody(validBody(3), 3)).toEqual([])
  })

  it('제목을 읽지 못해 이슈 번호가 없어도 본문 형식은 본다', () => {
    expect(checkBody(validBody(3), null)).toEqual([])
  })

  it('CRLF 줄바꿈도 같게 본다', () => {
    expect(checkBody(validBody(3).replaceAll('\n', '\r\n'), 3)).toEqual([])
  })

  it('이모지 뒤 변형 선택자가 없어도 같은 제목으로 본다', () => {
    expect(checkBody(validBody(3).replaceAll('️', ''), 3)).toEqual([])
  })

  it('본문에 다른 내용이 더 있어도 통과한다', () => {
    expect(checkBody(`${validBody(3)}\n추가 메모`, 3)).toEqual([])
  })

  it.each([null, undefined, ''])(
    '본문이 비어 있으면 섹션 4개가 모두 없다고 알려 준다: %j',
    (body) => {
      expect(checkBody(body, 3).filter((problem) => problem.includes('섹션이 없다'))).toHaveLength(
        4,
      )
    },
  )

  it('섹션이 빠지면 어느 섹션인지 알려 준다', () => {
    const body = validBody(3).replace('## 📸 결과물\n해당 없음\n\n', '')
    const problems = checkBody(body, 3)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('결과물')
  })

  it.each([
    ['개요', '> 패키지 뼈대를 구성', '> 작업 내용 한 줄 요약'],
    ['작업 내용', '- package.json 작성\n- tsconfig 설정', '- 구체적인 변경 사항'],
    ['결과물', '해당 없음', '(스크린샷)'],
  ])('템플릿 문구가 그대로 남은 %s 섹션은 실패한다', (_name, written, placeholder) => {
    const problems = checkBody(validBody(3).replace(written, placeholder), 3)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('템플릿 문구')
  })

  it('섹션 내용이 비어 있으면 실패한다', () => {
    const body = validBody(3).replace('해당 없음', '')
    expect(checkBody(body, 3)).toHaveLength(1)
  })

  it('템플릿의 #N을 바꾸지 않으면 실패한다', () => {
    const problems = checkBody(validBody('N'), 3)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('#N')
  })

  it('closes 번호가 제목의 이슈 번호와 다르면 실패한다', () => {
    const problems = checkBody(validBody(4), 3)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('#4')
  })

  it('이슈 번호 줄이 없으면 실패한다', () => {
    const body = validBody(3).replace('- 이슈 번호: closes #3\n', '- 링크 없음\n')
    expect(checkBody(body, 3)).toHaveLength(1)
  })

  it('이슈 번호 줄이 둘 이상이면 실패한다', () => {
    const body = `${validBody(3).trimEnd()}\n- 이슈 번호: closes #4\n`
    expect(checkBody(body, 3)).toHaveLength(1)
  })

  it('closes 대신 다른 키워드를 쓰면 실패한다', () => {
    const body = validBody(3).replace('closes', 'fixes')
    expect(checkBody(body, 3)).toHaveLength(1)
  })

  it('섹션이 중복되면 실패한다', () => {
    const body = `${validBody(3)}\n## 📸 결과물\n또 하나\n`
    expect(checkBody(body, 3).some((problem) => problem.includes('두 번'))).toBe(true)
  })

  it('섹션 순서가 바뀌면 실패한다', () => {
    const body = [
      '## 🛠️ 작업 내용',
      '- 작업',
      '',
      '## 📍 개요',
      '> 개요',
      '',
      '## 📸 결과물',
      '해당 없음',
      '',
      '## 🔗 관련 링크',
      '- 이슈 번호: closes #3',
    ].join('\n')
    expect(checkBody(body, 3)).toEqual(['섹션 순서가 PR 템플릿과 다르다'])
  })
})
