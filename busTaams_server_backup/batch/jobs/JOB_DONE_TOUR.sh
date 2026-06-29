#!/bin/bash
# Shell script wrapper to execute Node.js JOB_DONE_TOUR batch logic.
CUR_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$CUR_DIR/JOB_DONE_TOUR.js"
