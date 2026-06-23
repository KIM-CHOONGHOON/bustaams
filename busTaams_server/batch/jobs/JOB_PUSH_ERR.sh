#!/bin/bash
# Shell script wrapper to execute Node.js JOB_PUSH_ERR batch logic.
CUR_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$CUR_DIR/JOB_PUSH_ERR.js"
