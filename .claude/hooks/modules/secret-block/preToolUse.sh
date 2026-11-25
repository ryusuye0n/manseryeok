#!/usr/bin/env bash
# secret-block: 비밀값이 파일에 쓰이거나 커밋에 들어가는 것을 막는다.
#
#   1. Write, Edit, Bash 입력에 토큰이나 키 같은 패턴이 있으면 막는다.
#      Codex 의 파일 수정 도구(apply_patch)는 패치 내용이 command 에 담겨 오므로 같이 검사한다.
#   2. .env 나 개인 키 같은 파일을 git add 하려 하면 막는다.
#
# 막을 때 비밀값 자체는 출력하지 않고 종류만 알려 준다.
# 입력: PreToolUse JSON (stdin)   출력: 막을 때 exit 2 + stderr 안내

. "$(dirname "$0")/../../lib/json.sh"
HOOK_INPUT="$(cat)"
tool="$(json_get tool_name)"

deny() {
  printf '[%s] 차단: %s\n%s\n' "secret-block" "$1" "$2" >&2
  exit 2
}

# ── 1. 입력에 비밀값 패턴이 있는지 ──────────────────────────────

secret_labels=(
  "AWS 액세스 키"
  "GitHub 토큰"
  "GitHub 세분화된 토큰"
  "API 키(sk- 형식)"
  "Slack 토큰"
  "Google API 키"
  "개인 키"
)
secret_patterns=(
  'AKIA[0-9A-Z]{16}'
  'gh[pousr]_[A-Za-z0-9]{36,}'
  'github_pat_[A-Za-z0-9_]{22,}'
  '(^|[^A-Za-z0-9_])sk-(ant-|proj-)?[A-Za-z0-9_-]{20,}'
  'xox[abprs]-[A-Za-z0-9-]{10,}'
  'AIza[0-9A-Za-z_-]{35}'
  '-----BEGIN ([A-Z]+ )?PRIVATE KEY-----'
)

case "$tool" in
  Write) text="$(json_get tool_input.content)" ;;
  Edit) text="$(json_get tool_input.new_string)" ;;
  Bash | apply_patch) text="$(json_get tool_input.command)" ;;
  *) exit 0 ;;
esac

if [ -n "$text" ]; then
  for i in "${!secret_patterns[@]}"; do
    if printf '%s' "$text" | grep -qE -e "${secret_patterns[$i]}"; then
      deny "${secret_labels[$i]}로 보이는 문자열" "비밀값은 코드나 명령에 직접 적지 말고 환경 변수나 비밀 저장소를 쓰세요."
    fi
  done
fi

# ── 2. 비밀 파일을 git add 하는지 ───────────────────────────────

# .env.example 같은 견본은 통과시키고, 실제 비밀이 들어가는 파일만 true 로 본다.
is_secret_file() {
  local base="${1##*/}"
  case "$base" in
    .env.example | .env.sample | .env.template | .env.dist) return 1 ;;
    .env | .env.*) return 0 ;;
    *.pem | *.key | *.p12 | *.pfx | *.jks | *.keystore) return 0 ;;
    id_rsa | id_ecdsa | id_ed25519 | credentials.json) return 0 ;;
  esac
  return 1
}

if [ "$tool" = "Bash" ]; then
  command="$(json_get tool_input.command)"
  segments="$(printf '%s' "$command" | sed 's/&&/\n/g; s/||/\n/g; s/[;|&]/\n/g')"

  while IFS= read -r segment; do
    read -r -a words <<< "$segment"
    [ "${words[0]:-}" = "git" ] && [ "${words[1]:-}" = "add" ] || continue

    add_all=0
    for word in "${words[@]:2}"; do
      case "$word" in
        -A | --all | "." | "*" | ":/") add_all=1 ;;
        -*) ;;
        *) is_secret_file "$word" && deny "비밀 파일 git add: $word" "비밀 파일은 커밋하지 않습니다. .gitignore 에 추가하세요." ;;
      esac
    done

    # git add . 처럼 한꺼번에 담을 때는 아직 추적하지 않는 파일 중에 비밀 파일이 있는지 본다.
    if [ "$add_all" -eq 1 ]; then
      while IFS= read -r file; do
        [ -n "$file" ] || continue
        is_secret_file "$file" && deny "비밀 파일이 한꺼번에 담김: $file" "이 파일을 .gitignore 에 추가한 뒤 다시 시도하세요."
      done < <(git ls-files --others --exclude-standard 2>/dev/null)
    fi
  done <<< "$segments"
fi

exit 0
