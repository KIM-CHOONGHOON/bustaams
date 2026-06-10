#!/bin/bash
# Shell script wrapper to execute Node.js JOB_MOM_RESET batch logic.
CUR_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$CUR_DIR/JOB_MOM_RESET.js"
