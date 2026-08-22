#!/usr/bin/env bash
# 职责:SSE 多实例互通验收脚本(T2 / PKG-08 L-6 验收线)
# 场景:两个 API 实例(3000/3001)各自订阅同一任务频道 → redis-cli publish 一条进度 → 断言两实例的
#       /v1/tasks/:id/events 流均收到该消息(Redis pub/sub 天然跨实例,本脚本落袋为安)。
# 前提:server/.env 存在(或用默认连接串)、docker compose(PG/Redis)已起、apps/api 已构建。
# 用法:cd server && bash scripts/sse-demo.sh   —— 可重复执行,退出码 0=全绿。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_ID="sse-demo-$$"
OUT1="$(mktemp)"
OUT2="$(mktemp)"
PIDS=()

cleanup() {
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  rm -f "$OUT1" "$OUT2"
}
trap cleanup EXIT

fail() { echo "FAIL: $*"; exit 1; }
[ -f "$ROOT/apps/api/dist/main.js" ] || fail "apps/api 未构建,先执行 pnpm --filter @vrm/api build"
docker inspect vrm-redis >/dev/null 2>&1 || fail "vrm-redis 容器未启动(cd server && pnpm db:up)"

echo "[1/5] 起两个 API 实例(3000/3001)"
API_PORT=3000 node "$ROOT/apps/api/dist/main.js" >/dev/null 2>&1 & PIDS+=($!)
API_PORT=3001 node "$ROOT/apps/api/dist/main.js" >/dev/null 2>&1 & PIDS+=($!)

for port in 3000 3001; do
  for _ in $(seq 1 30); do
    curl -sf "http://127.0.0.1:$port/v1/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -sf "http://127.0.0.1:$port/v1/health" >/dev/null || fail "端口 $port 健康检查超时"
done

echo "[2/5] 游客登录取 JWT"
LOGIN=$(curl -sf -X POST http://127.0.0.1:3000/v1/auth/guest -H 'Content-Type: application/json' -d "{\"deviceId\":\"sse-demo-$$\"}")
TOKEN=$(printf '%s' "$LOGIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] || fail "登录失败: $LOGIN"

echo "[3/5] 两实例同时订阅 /v1/tasks/$TASK_ID/events"
curl -sN -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:3000/v1/tasks/$TASK_ID/events" >"$OUT1" 2>/dev/null & PIDS+=($!)
curl -sN -H "Authorization: Bearer $TOKEN" "http://127.0.0.1:3001/v1/tasks/$TASK_ID/events" >"$OUT2" 2>/dev/null & PIDS+=($!)
sleep 2

echo "[4/5] redis-cli 发布进度事件"
PUBLISHED=$(docker exec vrm-redis redis-cli publish "vrm:task:$TASK_ID" '{"progress":42,"status":"GENERATING"}')
echo "      subscribers reached: $PUBLISHED"
sleep 2

echo "[5/5] 断言两实例均收到"
grep -q '"progress":42' "$OUT1" || { echo "--- 实例3000 输出 ---"; cat "$OUT1"; fail "实例 3000 未收到进度事件"; }
grep -q '"progress":42' "$OUT2" || { echo "--- 实例3001 输出 ---"; cat "$OUT2"; fail "实例 3001 未收到进度事件"; }

echo "PASS: 两个 API 实例均通过 Redis pub/sub 收到 SSE 进度事件"
