#!/usr/bin/env bash
# 훅 디스패처.  사용법: run.sh <preToolUse|postToolUse|sessionStart>
#
# modules/*/<이벤트>.sh 를 이름순으로 실행한다. 모든 모듈이 같은 JSON 입력을 stdin 으로 받는다.
#   - preToolUse : 모듈 하나가 exit 2 로 끝나면 거기서 멈추고 도구 호출을 막는다.
#   - 그 밖의 이벤트 : 모든 모듈을 끝까지 실행하고, exit 2 가 하나라도 있었다면 2 로 끝낸다.
#
# 모듈을 쓰려면 modules/ 아래에 폴더를 두고, 폴더를 지우면 모듈이 빠진다. 이 파일은 고치지 않는다.
set -u

event="${1:-}"
if [ -z "$event" ]; then
  echo "[harness] 이벤트 이름이 필요합니다. 예: run.sh preToolUse" >&2
  exit 1
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
modules_dir="$here/../modules"
. "$here/../lib/json.sh"

if ! json_tool_available; then
  echo "[harness] jq 또는 node 가 없어 훅을 건너뜁니다. 둘 중 하나를 설치하세요." >&2
  exit 1
fi

HOOK_INPUT="$(cat)"
final=0

for module in "$modules_dir"/*/"$event".sh; do
  [ -f "$module" ] || continue
  printf '%s' "$HOOK_INPUT" | bash "$module"
  status=$?
  if [ "$status" -eq 2 ]; then
    final=2
    [ "$event" = "preToolUse" ] && break
  fi
done

exit "$final"
