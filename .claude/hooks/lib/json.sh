#!/usr/bin/env bash
# 훅 입력(JSON)에서 값을 꺼내는 헬퍼. 모듈에서 source 해서 쓴다.
#
#   . "$(dirname "$0")/../../lib/json.sh"
#   HOOK_INPUT="$(cat)"
#   command="$(json_get tool_input.command)"
#
# jq 가 있으면 jq 를, 없으면 node 를 쓴다. 둘 다 없으면 json_tool_available 이 실패한다.

json_tool_available() {
  command -v jq >/dev/null 2>&1 || command -v node >/dev/null 2>&1
}

# 점으로 이어 쓴 경로의 값을 출력한다. 값이 없으면 아무것도 출력하지 않는다.
json_get() {
  local path="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$HOOK_INPUT" | jq -r ".${path} // empty" 2>/dev/null
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$HOOK_INPUT" | node -e '
      let raw = "";
      process.stdin.on("data", (chunk) => (raw += chunk));
      process.stdin.on("end", () => {
        try {
          let value = JSON.parse(raw);
          for (const key of process.argv[1].split(".")) value = value?.[key];
          if (value !== undefined && value !== null) {
            console.log(typeof value === "object" ? JSON.stringify(value) : value);
          }
        } catch {}
      });
    ' "$path"
  fi
}
