#!/usr/bin/env bash
# tool-log: 도구 호출을 한 줄씩 기록한다. 어떤 일이 있었는지 나중에 돌아볼 때 쓴다.
#
# 기본 위치는 ~/.claude/logs/harness-tools.log 이고 HARNESS_LOG_FILE 로 바꿀 수 있다.
# 레포 밖에 두어서 실수로 커밋되지 않게 했다. 명령은 200자까지만 남기고 가리지는 않으니,
# 명령에 비밀값이 섞일 수 있다는 점은 감안한다.
# 기록만 하고 도구 호출을 막지는 않는다.

. "$(dirname "$0")/../../lib/json.sh"
HOOK_INPUT="$(cat)"

tool="$(json_get tool_name)"
[ -n "$tool" ] || exit 0

case "$tool" in
  Bash | apply_patch) detail="$(json_get tool_input.command)" ;;
  Read | Write | Edit) detail="$(json_get tool_input.file_path)" ;;
  *) detail="" ;;
esac
detail="${detail//$'\n'/ }"
detail="${detail:0:200}"

log_file="${HARNESS_LOG_FILE:-$HOME/.claude/logs/harness-tools.log}"
mkdir -p "$(dirname "$log_file")" 2>/dev/null || exit 0
printf '%s\t%s\t%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$tool" "$detail" >> "$log_file" 2>/dev/null

exit 0
