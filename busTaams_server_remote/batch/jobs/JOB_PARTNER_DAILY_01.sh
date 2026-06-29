#!/bin/bash
# Shell script wrapper to execute Node.js JOB_PARTNER_DAILY_01 batch logic.
CUR_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$CUR_DIR/JOB_PARTNER_DAILY_01.js"
