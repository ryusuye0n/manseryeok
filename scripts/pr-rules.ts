// PR 제목, 브랜치 이름, 커밋 메시지, 본문이 CLAUDE.md의 규칙을 지키는지 판단한다.
// 입출력 없이 문자열만 다루는 순수 함수라서 단위 테스트로 규칙을 검증한다.

export const TYPES = ['feat', 'fix', 'docs', 'chore', 'refactor', 'test'] as const

export type ChangeType = (typeof TYPES)[number]

export interface ParsedTitle {
  type: ChangeType
  description: string
  issue: number
}

const TYPE_ALTERNATIVES = TYPES.join('|')
const TITLE_PATTERN = new RegExp(`^\\[(${TYPE_ALTERNATIVES})\\] (.+) - #([1-9][0-9]*)$`)
const BRANCH_PATTERN = new RegExp(
  `^(${TYPE_ALTERNATIVES})/([1-9][0-9]*)-([a-z0-9]+(?:-[a-z0-9]+)*)$`,
)
const COMMIT_PATTERN = new RegExp(`^(${TYPE_ALTERNATIVES}): (.+)$`)
const HANGUL = /[가-힣]/
const AI_ATTRIBUTION = [/co-authored-by:/i, /generated with/i, /🤖/u]

function isChangeType(value: string): value is ChangeType {
  return (TYPES as readonly string[]).includes(value)
}

export function parseTitle(title: string): ParsedTitle | null {
  const match = TITLE_PATTERN.exec(title)
  const type = match?.[1]
  const description = match?.[2]
  const issue = match?.[3]
  if (type === undefined || description === undefined || issue === undefined) return null
  if (!isChangeType(type)) return null
  return { type, description, issue: Number(issue) }
}

function checkDescription(description: string, label: string): string[] {
  const problems: string[] = []
  if (description.trim() !== description) problems.push(`${label}의 설명 앞뒤에 공백이 있다`)
  if (description.endsWith('.')) {
    problems.push(`${label}의 설명이 마침표로 끝난다. 명사형으로 끝내고 마침표를 쓰지 않는다`)
  }
  if (!HANGUL.test(description)) problems.push(`${label}의 설명은 한국어로 쓴다`)
  return problems
}

export function checkTitle(title: string): string[] {
  const parsed = parseTitle(title)
  if (parsed === null) {
    return [
      `제목이 \`[type] 설명 - #이슈번호\` 형식이 아니다. type은 ${TYPES.join(', ')} 중 하나다. (예: \`[feat] 대운 계산 추가 - #12\`)`,
    ]
  }
  return checkDescription(parsed.description, '제목')
}

export function checkBranch(branch: string, title: ParsedTitle | null): string[] {
  const match = BRANCH_PATTERN.exec(branch)
  const type = match?.[1]
  const issue = match?.[2]
  if (type === undefined || issue === undefined) {
    return [
      `브랜치 이름이 \`<type>/<이슈번호>-<영문 kebab-case>\` 형식이 아니다. (예: \`feat/12-add-daeun\`) 현재: \`${branch}\``,
    ]
  }
  if (title === null) return []
  const problems: string[] = []
  if (type !== title.type) {
    problems.push(`브랜치의 type(${type})이 제목의 type(${title.type})과 다르다`)
  }
  if (Number(issue) !== title.issue) {
    problems.push(`브랜치의 이슈 번호(#${issue})가 제목의 이슈 번호(#${title.issue})와 다르다`)
  }
  return problems
}

export function checkCommit(message: string): string[] {
  const normalized = message.replace(/\r\n/g, '\n').trim()
  const lines = normalized.split('\n')
  const subject = lines[0] ?? ''
  const problems: string[] = []

  const match = COMMIT_PATTERN.exec(subject)
  if (match === null) {
    problems.push(`커밋 제목이 \`type: 설명\` 형식이 아니다. type은 ${TYPES.join(', ')} 중 하나다.`)
  } else {
    problems.push(...checkDescription(match[2] ?? '', '커밋'))
  }
  if (lines.length > 1) problems.push('커밋 본문을 쓰지 않는다. 제목 한 줄만 쓴다')
  if (AI_ATTRIBUTION.some((pattern) => pattern.test(normalized))) {
    problems.push('AI 공동 저자 표기를 쓰지 않는다')
  }
  return problems
}

export const SECTION_HEADINGS = [
  '## 📍 개요',
  '## 🛠️ 작업 내용',
  '## 📸 결과물',
  '## 🔗 관련 링크',
] as const

const PLACEHOLDERS = ['> 작업 내용 한 줄 요약', '- 구체적인 변경 사항', '(스크린샷)']
const ISSUE_LINE_PREFIX = '- 이슈 번호:'
const CLOSES_LINE = /^- 이슈 번호: closes #([1-9][0-9]*)$/

// 이모지 뒤의 변형 선택자(U+FE0F) 유무가 달라도 같은 제목으로 본다.
function normalizeHeading(text: string): string {
  return text.replaceAll('️', '').trim()
}

export function checkBody(body: string | null | undefined, issue: number | null): string[] {
  const problems: string[] = []
  const lines = (body ?? '').replace(/\r\n/g, '\n').split('\n')
  const headings = SECTION_HEADINGS.map(normalizeHeading)

  const sections = new Map<number, string[]>()
  const order: number[] = []
  let current: string[] | null = null
  for (const line of lines) {
    const index = headings.indexOf(normalizeHeading(line))
    if (index === -1) {
      current?.push(line)
      continue
    }
    if (sections.has(index)) {
      problems.push(`\`${SECTION_HEADINGS[index]}\` 섹션이 두 번 있다`)
      current = null
      continue
    }
    current = []
    sections.set(index, current)
    order.push(index)
  }

  for (const [index, heading] of SECTION_HEADINGS.entries()) {
    const content = sections.get(index)
    if (content === undefined) {
      problems.push(`본문에 \`${heading}\` 섹션이 없다`)
      continue
    }
    const filled = content.map((line) => line.trim()).filter((line) => line !== '')
    const written = filled.filter((line) => !PLACEHOLDERS.includes(line))
    if (written.length === 0) {
      problems.push(`\`${heading}\` 섹션이 비어 있거나 템플릿 문구 그대로다`)
    }
  }

  const ascending = order.every(
    (value, position) => position === 0 || value > (order[position - 1] ?? -1),
  )
  if (!ascending) problems.push('섹션 순서가 PR 템플릿과 다르다')

  const linkSection = sections.get(SECTION_HEADINGS.indexOf('## 🔗 관련 링크'))
  if (linkSection !== undefined) {
    const issueLines = linkSection
      .map((line) => line.trim())
      .filter((line) => line.startsWith(ISSUE_LINE_PREFIX))
    if (issueLines.length !== 1) {
      problems.push('관련 링크에 `- 이슈 번호: closes #번호` 줄이 정확히 하나 있어야 한다')
    } else {
      const match = CLOSES_LINE.exec(issueLines[0] ?? '')
      if (match === null) {
        problems.push(
          '이슈 줄이 `- 이슈 번호: closes #번호` 형식이 아니다. 템플릿의 #N을 실제 번호로 바꾼다',
        )
      } else if (issue !== null && Number(match[1]) !== issue) {
        problems.push(`본문의 closes #${match[1]}이 제목의 이슈 번호(#${issue})와 다르다`)
      }
    }
  }
  return problems
}
