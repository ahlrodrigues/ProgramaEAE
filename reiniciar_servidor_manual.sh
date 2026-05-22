#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/server.pid"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3000}"

stop_pid_file_process() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$PID_FILE"
    return 0
  fi

  if kill -0 "$pid" 2>/dev/null; then
    echo "Parando processo registrado em server.pid: $pid"
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      echo "Forcando encerramento do PID $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi

  rm -f "$PID_FILE"
}

stop_port_processes() {
  local pids=()

  if command -v lsof >/dev/null 2>&1; then
    mapfile -t pids < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN -n -P 2>/dev/null | sort -u)
  elif command -v fuser >/dev/null 2>&1; then
    mapfile -t pids < <(fuser -n tcp "$PORT" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | sort -u)
  else
    echo "Aviso: nem lsof nem fuser estão disponíveis para liberar a porta $PORT."
    return 0
  fi

  if [[ "${#pids[@]}" -eq 0 ]]; then
    return 0
  fi

  echo "Parando processo(s) escutando em $HOST:$PORT: ${pids[*]}"
  kill "${pids[@]}" 2>/dev/null || true
  sleep 1

  local remaining=()
  if command -v lsof >/dev/null 2>&1; then
    mapfile -t remaining < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN -n -P 2>/dev/null | sort -u)
  elif command -v fuser >/dev/null 2>&1; then
    mapfile -t remaining < <(fuser -n tcp "$PORT" 2>/dev/null | tr ' ' '\n' | sed '/^$/d' | sort -u)
  fi
  if [[ "${#remaining[@]}" -gt 0 ]]; then
    echo "Forcando encerramento do(s) PID(s): ${remaining[*]}"
    kill -9 "${remaining[@]}" 2>/dev/null || true
  fi
}

cd "$ROOT_DIR"
stop_pid_file_process
stop_port_processes
bash scripts/server-local.sh start
