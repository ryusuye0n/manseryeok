// 대운(10년 단위로 이어지는 운의 흐름)을 구한다.
//
// 방향: 연간이 양(갑 병 무 경 임)인 남자와 연간이 음(을 정 기 신 계)인 여자는 순행, 반대는 역행이다.
//   순행이면 월주의 60갑자 순서를 하나씩 늘리고, 역행이면 하나씩 줄인다.
// 시작 나이(대운수): 순행은 출생 시각에서 다음 12절까지, 역행은 직전 12절까지의 시간으로 정한다.
//   3일을 1년으로 본다. 그래서 1일은 4개월, 6시간은 1개월, 12분은 1일, 1분은 2시간이다 (분 단위까지 정밀하게 환산한다).
// 대운은 출생 후 시작 나이가 되면 시작해 10년마다 다음 간지로 바뀐다.

import { type Pillar, pillarFromIndex } from './ganzhi'
import { toKoreaStandardTime } from './korea-time'
import { type BirthInput, getSaju, type SajuOptions, type SajuWarning } from './saju'
import { getJieTerms } from './solar-terms'

export type Gender = 'male' | 'female'

export type LuckDirection = 'forward' | 'backward'

// 출생 후 지난 시간을 대운 방식(3일 = 1년)으로 환산한 나이. 만 나이처럼 달과 일은 0부터 센다.
export interface LuckAge {
  years: number
  // 0~11
  months: number
  // 0~29
  days: number
  // 0~23. 12분이 1일이므로 1분은 2시간이다.
  hours: number
}

// 양력 날짜
export interface LuckDate {
  year: number
  month: number
  day: number
}

export interface MajorLuckPeriod {
  pillar: Pillar
  // 이 대운이 시작되는 나이. 첫 대운은 시작 나이 그대로이고 다음부터 10년씩 늘어난다.
  startAge: LuckAge
  // 이 대운이 시작되는 양력 날짜 (출생 날짜에 시작 나이를 달력으로 더한 값)
  startDate: LuckDate
  // 이 대운이 시작되는 해의 한국식 세는 나이 (시작하는 해 - 출생 연도 + 1)
  koreanAge: number
}

export type MajorLuckWarning =
  | SajuWarning
  | {
      // 출생 시각을 모르고 정오로 계산했다. 시작 나이가 이 값(개월)만큼 어긋날 수 있다.
      type: 'start-age-approximate'
      maxErrorMonths: number
    }

export interface MajorLuck {
  direction: LuckDirection
  // 첫 대운이 시작되는 나이 (대운수)
  startAge: LuckAge
  periods: MajorLuckPeriod[]
  warnings: MajorLuckWarning[]
}

export interface MajorLuckOptions extends SajuOptions {
  // 구할 대운의 개수 (1~12, 기본값 10)
  count?: number
}

const MINUTES_PER_YEAR_OF_AGE = 3 * 24 * 60
const MINUTES_PER_MONTH_OF_AGE = 6 * 60
const MINUTES_PER_DAY_OF_AGE = 12
const DEFAULT_COUNT = 10
const MAX_COUNT = 12

const toMs = (time: {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}): number => Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute)

function ageFromMinutes(minutes: number): LuckAge {
  const years = Math.floor(minutes / MINUTES_PER_YEAR_OF_AGE)
  const afterYears = minutes % MINUTES_PER_YEAR_OF_AGE
  const months = Math.floor(afterYears / MINUTES_PER_MONTH_OF_AGE)
  const afterMonths = afterYears % MINUTES_PER_MONTH_OF_AGE
  const days = Math.floor(afterMonths / MINUTES_PER_DAY_OF_AGE)
  const hours = (afterMonths % MINUTES_PER_DAY_OF_AGE) * 2
  return { years, months, days, hours }
}

// 출생 시각에 나이만큼 달력으로 더한 날짜. 년과 월을 먼저 더하고(없는 날짜는 그달 말일로),
// 그다음 일과 시간을 더한다. 시간이 하루를 넘기면 날짜가 하나 늘어난다.
export function addAge(
  birth: { year: number; month: number; day: number; hour: number },
  age: LuckAge,
): LuckDate {
  const totalMonths = (birth.year + age.years) * 12 + (birth.month - 1) + age.months
  const year = Math.floor(totalMonths / 12)
  const month = (totalMonths % 12) + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const result = new Date(
    Date.UTC(year, month - 1, Math.min(birth.day, lastDay) + age.days, birth.hour + age.hours),
  )
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  }
}

export function getMajorLuck(
  birth: BirthInput,
  gender: Gender,
  options?: MajorLuckOptions,
): MajorLuck {
  if (gender !== 'male' && gender !== 'female') {
    throw new RangeError(`gender는 'male' 또는 'female'이어야 한다: ${JSON.stringify(gender)}`)
  }
  const count = options?.count ?? DEFAULT_COUNT
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    throw new RangeError(`options.count는 1~${MAX_COUNT} 사이의 정수여야 한다: ${String(count)}`)
  }

  const saju = getSaju(birth, options)
  const timeKnown = saju.standardTime !== null
  const standard =
    saju.standardTime ??
    toKoreaStandardTime({
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: 12,
      minute: 0,
    }).time
  const warnings: MajorLuckWarning[] = [...saju.warnings]
  if (!timeKnown) warnings.push({ type: 'start-age-approximate', maxErrorMonths: 2 })

  // 연간이 양(60갑자 순서가 짝수)인지
  const yearIsYang = saju.pillars.year.index % 2 === 0
  const forward = (gender === 'male') === yearIsYang

  // 시각 순서로 이어 붙인 12절(앞뒤 해 포함)
  const at = toMs(standard)
  const terms = [standard.year - 1, standard.year, standard.year + 1].flatMap((year) =>
    getJieTerms(year),
  )
  const nextIndex = terms.findIndex((term) => toMs(term) > at)
  // 순행은 다음 절, 역행은 이미 지난(같은 순간 포함) 직전 절이다
  const target = forward
    ? terms[nextIndex]
    : terms[(nextIndex === -1 ? terms.length : nextIndex) - 1]
  if (target === undefined) {
    throw new RangeError(
      `대운 시작 나이를 구할 절기를 알 수 없다 (지원 범위 밖): ${birth.year}-${birth.month}-${birth.day}`,
    )
  }
  const startAge = ageFromMinutes(Math.abs(toMs(target) - at) / 60_000)

  const step = forward ? 1 : -1
  const periods: MajorLuckPeriod[] = Array.from({ length: count }, (_value, index) => {
    const periodAge: LuckAge = { ...startAge, years: startAge.years + 10 * index }
    const startDate = addAge(standard, periodAge)
    return {
      pillar: pillarFromIndex(saju.pillars.month.index + step * (index + 1)),
      startAge: periodAge,
      startDate,
      koreanAge: startDate.year - birth.year + 1,
    }
  })

  return { direction: forward ? 'forward' : 'backward', startAge, periods, warnings }
}
