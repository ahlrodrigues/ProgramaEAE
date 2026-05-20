#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/server.pid"
LOG_FILE="$ROOT_DIR/server.log"
ENV_FILE="$ROOT_DIR/.env"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-3000}"
DB_PATH="${DB_PATH:-$ROOT_DIR/data/eae.sqlite}"

command="${1:-start}"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  if [[ -z "$pid" ]]; then
    return 1
  fi

  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  rm -f "$PID_FILE"
  return 1
}

start_server() {
  if is_running; then
    echo "Servidor já está em execução com PID $(cat "$PID_FILE")."
    return 0
  fi

  mkdir -p "$(dirname "$DB_PATH")"
  cd "$ROOT_DIR"
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
  setsid env HOST="$HOST" PORT="$PORT" DB_PATH="$DB_PATH" node server.js >> "$LOG_FILE" 2>&1 < /dev/null &
  echo $! > "$PID_FILE"
  sleep 1

  if is_running; then
    echo "Servidor iniciado em segundo plano."
    echo "PID: $(cat "$PID_FILE")"
    echo "URL: http://$HOST:$PORT"
    echo "Log: $LOG_FILE"
    return 0
  fi

  echo "Falha ao iniciar o servidor. Verifique $LOG_FILE."
  return 1
}

stop_server() {
  if ! is_running; then
    echo "Servidor não está em execução."
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid"

  for _ in 1 2 3 4 5; do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "Servidor parado."
      return 0
    fi
    sleep 1
  done

  echo "Servidor não encerrou a tempo. Forçando parada."
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "Servidor parado."
}

status_server() {
  if is_running; then
    echo "Servidor em execução com PID $(cat "$PID_FILE")."
    echo "URL: http://$HOST:$PORT"
    echo "Log: $LOG_FILE"
    return 0
  fi

  echo "Servidor parado."
}

case "$command" in
  start)
    start_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  stop)
    stop_server
    ;;
  status)
    status_server
    ;;
  *)
    echo "Uso: bash scripts/server-local.sh {start|restart|stop|status}"
    exit 1
    ;;
esac
