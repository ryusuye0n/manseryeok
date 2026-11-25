// PR 규칙 검사 실행기. GitHub Actions의 pull_request 이벤트 데이터를 읽어 규칙을 검사한다.
//
//   node scripts/check-pr.ts                     (Actions: GITHUB_EVENT_PATH 등을 환경 변수로 받는다)
//   node scripts/check-pr.ts --event 이벤트.json --offline   (로컬 확인용. 이슈 존재 확인을 건너뛴다)
//
// 규칙 판단은 pr-rules.ts가 하고, 이 파일은 읽고 쓰는 일만 한다.

import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { checkBody, checkBranch, checkCommit, checkTitle, parseTitle } from './pr-rules.ts'

interface PullRequestEvent {
  pull_request: {
    title: string
    body: string | null
    head: { ref: string; sha: string }
    base: { sha: string }
  }
}

interface Finding {
  subject: string
  problems: string[]
}

interface Options {
  eventPath: string | undefined
  repository: string | undefined
  token: string | undefined
  offline: boolean
}

function parseArgs(args: readonly string[]): Options {
  const options: Options = {
    eventPath: process.env.GITHUB_EVENT_PATH,
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GITHUB_TOKEN,
    offline: false,
  }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--offline') options.offline = true
    else if (arg === '--event') options.eventPath = args[++index]
    else if (arg === '--repo') options.repository = args[++index]
    else throw new Error(`알 수 없는 인자: ${arg}`)
  }
  return options
}

function readCommits(base: string, head: string): { sha: string; message: string }[] {
  const output = execFileSync(
    'git',
    ['log', '--no-merges', '--reverse', '--format=%H%x1f%B%x1e', `${base}..${head}`],
    { encoding: 'utf8' },
  )
  return output
    .split('\x1e')
    .map((record) => record.replace(/^\n/, ''))
    .filter((record) => record.trim() !== '')
    .map((record) => {
      const [sha = '', ...rest] = record.split('\x1f')
      return { sha, message: rest.join('\x1f') }
    })
}

async function checkIssue(
  repository: string,
  issue: number,
  token: string | undefined,
): Promise<string[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'manseryeok-pr-rules',
  }
  if (token !== undefined && token !== '') headers.Authorization = `Bearer ${token}`
  const response = await fetch(`https://api.github.com/repos/${repository}/issues/${issue}`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  })
  if (response.status === 404) return [`제목의 #${issue} 이슈가 존재하지 않는다`]
  if (!response.ok) {
    return [`#${issue} 이슈를 확인하지 못했다 (HTTP ${response.status}). 검사를 다시 실행한다`]
  }
  const data = (await response.json()) as { pull_request?: unknown }
  if (data.pull_request !== undefined) {
    return [`이슈 번호 자리에 PR 번호를 적었다: #${issue}. 이슈 번호를 적는다`]
  }
  return []
}

function report(findings: readonly Finding[]): void {
  const failed = findings.filter((finding) => finding.problems.length > 0)
  for (const finding of findings) {
    const mark = finding.problems.length === 0 ? '통과' : '실패'
    console.log(`[${mark}] ${finding.subject}`)
    for (const problem of finding.problems) {
      console.log(`    - ${problem}`)
      console.log(`::error title=${finding.subject}::${problem}`)
    }
  }
  const summaryPath = process.env.GITHUB_STEP_SUMMARY
  if (summaryPath !== undefined && summaryPath !== '') {
    const lines = ['## PR 규칙 검사', '', '| 항목 | 결과 |', '|---|---|']
    for (const finding of findings) {
      const result =
        finding.problems.length === 0 ? '통과' : finding.problems.map((p) => `❌ ${p}`).join('<br>')
      lines.push(`| ${finding.subject} | ${result} |`)
    }
    appendFileSync(summaryPath, `${lines.join('\n')}\n`)
  }
  if (failed.length > 0) console.log(`\n${failed.length}개 항목이 규칙에 맞지 않는다.`)
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2))
  if (options.eventPath === undefined) {
    console.error('이벤트 파일을 찾을 수 없다. --event <경로>를 주거나 Actions에서 실행한다.')
    return 2
  }
  const event = JSON.parse(readFileSync(options.eventPath, 'utf8')) as PullRequestEvent
  const pr = event.pull_request

  const parsed = parseTitle(pr.title)
  const findings: Finding[] = [
    { subject: `제목: ${pr.title}`, problems: checkTitle(pr.title) },
    { subject: `브랜치: ${pr.head.ref}`, problems: checkBranch(pr.head.ref, parsed) },
    { subject: '본문', problems: checkBody(pr.body, parsed?.issue ?? null) },
  ]

  if (parsed !== null && !options.offline) {
    if (options.repository === undefined) {
      console.error('저장소 이름을 알 수 없다. --repo <소유자/이름>을 주거나 --offline을 쓴다.')
      return 2
    }
    findings.push({
      subject: `이슈: #${parsed.issue}`,
      problems: await checkIssue(options.repository, parsed.issue, options.token),
    })
  }

  for (const commit of readCommits(pr.base.sha, pr.head.sha)) {
    const subject = commit.message.trim().split('\n')[0] ?? ''
    findings.push({
      subject: `커밋 ${commit.sha.slice(0, 7)}: ${subject}`,
      problems: checkCommit(commit.message),
    })
  }

  report(findings)
  return findings.some((finding) => finding.problems.length > 0) ? 1 : 0
}

try {
  process.exitCode = await main()
} catch (error) {
  console.error(`검사를 실행하지 못했다: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 2
}
