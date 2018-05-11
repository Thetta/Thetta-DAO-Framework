#!/bin/bash

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the testrpc instance that we started (if we started one).
  if [ -n "$testrpc_pid" ]; then
    kill -9 $testrpc_pid
  fi
}

testrpc_running() {
  nc -z localhost 8570
}

if testrpc_running; then
  echo "Using existing testrpc-sc instance"
else
  echo "Starting testrpc-sc to generate coverage"
  ./node_modules/.bin/testrpc --gasLimit 0xfffffffffff --port 8570 \
  > /dev/null &
  testrpc_pid=$!
fi

SOLIDITY_COVERAGE=true ./node_modules/.bin/solidity-coverage
