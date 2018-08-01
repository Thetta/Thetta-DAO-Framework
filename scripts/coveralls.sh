#!/bin/bash

npm run coverage && sleep 5 && cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js
