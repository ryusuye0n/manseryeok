#!/usr/bin/env bash
# irreversible-block: 실행하면 원래대로 돌릴 수 없는 셸 명령을 실행 전에 막는다.
#
# 기준은 하나다. 실행한 뒤에 되돌릴 방법이 남는가.
#   막는다    홈·루트·작업 폴더 삭제, 커밋하지 않은 변경 폐기, 원격 기록 덮어쓰기와 삭제
#   통과한다  node_modules 삭제(다시 설치하면 됨), git reset --soft(커밋이 남음),
#            git push --force-with-lease(남의 커밋을 덮지 않음)
# 위험해 보인다는 이유만으로 넓게 막지는 않는다.
#
# 입력: PreToolUse JSON (stdin)   출력: 막을 때 exit 2 + stderr 안내

. "$(dirname "$0")/../../lib/json.sh"
HOOK_INPUT="$(cat)"

[ "$(json_get tool_name)" = "Bash" ] || exit 0
command="$(json_get tool_input.command)"
[ -n "$command" ] || exit 0

deny() {
  printf '[%s] 차단: %s\n%s\n' "irreversible-block" "$1" "$2" >&2
  exit 2
}

# 파이프 앞뒤 명령도 따로 검사하려고 &&, ||, ;, |, & 기준으로 한 줄씩 나눈다.
segments="$(printf '%s' "$command" | sed 's/&&/\n/g; s/||/\n/g; s/[;|&]/\n/g')"

# ── 1. 시스템과 작업 트리 파괴 ──────────────────────────────────

re='(^|[[:space:];&|])sudo[[:space:]]+rm([[:space:]]|$)'
if [[ "$command" =~ $re ]]; then
  deny "sudo rm" "관리자 권한 삭제는 훅이 되돌릴 수 없습니다. 직접 실행하세요."
fi

# rm 이 -r 과 -f 로 루트, 홈, 상위·현재 디렉터리 전체 같은 곳을 지우는지 본다.
rm_wipes_everything() {
  local -a words
  local word recursive=0 force=0 seen_rm=0 wipes=0
  read -r -a words <<< "$1"
  for word in "${words[@]}"; do
    if [ "$seen_rm" -eq 0 ]; then
      [ "$word" = "rm" ] && seen_rm=1
      continue
    fi
    case "$word" in
      --recursive) recursive=1 ;;
      --force) force=1 ;;
      --*) ;;
      -*r* | -*R*)
        recursive=1
        case "$word" in -*f*) force=1 ;; esac
        ;;
      -*f*) force=1 ;;
      -*) ;;
      "/" | "/*" | "~" | "~/" | "~/*" | '$HOME' | '$HOME/' | '${HOME}' | ".." | "../" | "." | "./" | "*" | "./*")
        wipes=1
        ;;
      /[a-zA-Z] | /[a-zA-Z]/) wipes=1 ;;
    esac
  done
  [ "$recursive" -eq 1 ] && [ "$force" -eq 1 ] && [ "$wipes" -eq 1 ]
}

while IFS= read -r segment; do
  if rm_wipes_everything "$segment"; then
    deny "rm -rf (루트·홈·작업 디렉터리 전체)" "복구할 수 없는 삭제입니다. 지울 대상을 정확히 지정하세요."
  fi
done <<< "$segments"

re='(^|[[:space:]])dd[[:space:]]+[^|;&]*of=/dev/'
if [[ "$command" =~ $re ]]; then
  deny "dd of=/dev/..." "디바이스를 덮어씁니다. 직접 실행하세요."
fi

re='(^|[[:space:];&|])mkfs(\.[a-z0-9]+)?([[:space:]]|$)'
if [[ "$command" =~ $re ]]; then
  deny "mkfs" "파일시스템을 새로 만드는 명령입니다. 직접 실행하세요."
fi

re='>[[:space:]]*/dev/(sd[a-z]|hd[a-z]|vd[a-z]|nvme|mem|kmem)'
if [[ "$command" =~ $re ]]; then
  deny "디바이스에 직접 쓰기" "디바이스에 바로 쓰는 명령입니다. 직접 실행하세요."
fi

# ── 2. git: 남의 커밋을 덮거나 작업 내용을 버리는 명령 ──────────────

# --force-with-lease 는 허용하고, 그냥 --force, -f, +refspec 만 막는다.
git_force_push() {
  local -a words
  local word seen_git=0 seen_push=0
  read -r -a words <<< "$1"
  for word in "${words[@]}"; do
    if [ "$seen_git" -eq 0 ]; then
      [ "$word" = "git" ] && seen_git=1
      continue
    fi
    if [ "$seen_push" -eq 0 ]; then
      [ "$word" = "push" ] && seen_push=1
      continue
    fi
    case "$word" in
      --force-with-lease* | --force-if-includes) ;;
      --force) return 0 ;;
      --*) ;;
      -*f*) return 0 ;;
      +*) return 0 ;;
    esac
  done
  return 1
}

# git reset --hard 와 git clean -f 는 커밋하지 않은 변경을 되살릴 수 없게 만든다.
# git clean 은 -n(--dry-run)이 있으면 실제로 지우지 않으므로 통과시킨다.
git_discards_work() {
  local -a words
  local word sub="" seen_git=0 found=0 dry=0
  read -r -a words <<< "$1"
  for word in "${words[@]}"; do
    if [ "$seen_git" -eq 0 ]; then
      [ "$word" = "git" ] && seen_git=1
      continue
    fi
    if [ -z "$sub" ]; then
      case "$word" in reset | clean) sub="$word" ;; esac
      continue
    fi
    case "$sub:$word" in
      reset:--hard) found=1 ;;
      clean:--force) found=1 ;;
      clean:--dry-run) dry=1 ;;
      clean:--*) ;;
      clean:-*)
        case "$word" in -*f*) found=1 ;; esac
        case "$word" in -*n*) dry=1 ;; esac
        ;;
    esac
  done
  [ "$found" -eq 1 ] && [ "$dry" -eq 0 ]
}

while IFS= read -r segment; do
  if git_force_push "$segment"; then
    deny "git push --force" "남의 커밋을 덮을 수 있습니다. --force-with-lease 를 쓰거나 직접 실행하세요."
  fi
  if git_discards_work "$segment"; then
    deny "git reset --hard / git clean -f" "커밋하지 않은 변경이 사라집니다. 상태를 확인한 뒤 직접 실행하세요."
  fi
done <<< "$segments"

# ── 3. 원격 리소스 삭제와 받아서 바로 실행 ──────────────────────────

# git push --delete, git push origin :브랜치
git_deletes_remote_ref() {
  local -a words
  local word seen_git=0 seen_push=0
  read -r -a words <<< "$1"
  for word in "${words[@]}"; do
    if [ "$seen_git" -eq 0 ]; then
      [ "$word" = "git" ] && seen_git=1
      continue
    fi
    if [ "$seen_push" -eq 0 ]; then
      [ "$word" = "push" ] && seen_push=1
      continue
    fi
    case "$word" in
      --delete | -d) return 0 ;;
      :?*) return 0 ;;
    esac
  done
  return 1
}

re_gh_delete='(^|[[:space:]])gh[[:space:]]+(repo|release)[[:space:]]+delete([[:space:]]|$)'
re_gh_api_delete='(^|[[:space:]])gh[[:space:]]+api[[:space:]].*(-X|--method)[[:space:]=]*[Dd][Ee][Ll][Ee][Tt][Ee]'

while IFS= read -r segment; do
  if git_deletes_remote_ref "$segment"; then
    deny "원격 브랜치·태그 삭제" "원격에서 삭제하면 되돌리기 어렵습니다. 직접 실행하세요."
  fi
  if [[ "$segment" =~ $re_gh_delete ]] || [[ "$segment" =~ $re_gh_api_delete ]]; then
    deny "gh 원격 리소스 삭제" "GitHub 리소스 삭제는 되돌릴 수 없습니다. 직접 실행하세요."
  fi
done <<< "$segments"

# curl 이나 wget 으로 받은 내용을 검토 없이 셸에 넘기는 명령
re='(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z|da)?sh([[:space:]]|$)'
if [[ "$command" =~ $re ]]; then
  deny "받은 스크립트를 바로 셸에 전달" "스크립트를 먼저 내려받아 내용을 확인한 뒤 실행하세요."
fi

exit 0
