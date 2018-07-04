#!/bin/bash

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the testrpc-sc instance that we started (if we started one).
  if [ -n "$testrpcsc_pid" ]; then
    kill -9 $testrpcsc_pid
  fi
}

testrpcsc_running() {
  nc -z localhost 8570
}

if testrpcsc_running; then
  echo "Using existing testrpc-sc instance"
else
  echo "Starting testrpc-sc to generate coverage"
  ./node_modules/.bin/testrpc-sc --gasLimit 0xfffffffffff --port 8570 \
  > /dev/null &
  testrpcsc_pid=$!
fi

SOLIDITY_COVERAGE=true ./node_modules/.bin/solidity-coverage
