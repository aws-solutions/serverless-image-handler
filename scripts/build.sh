#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$DIR/setup.sh"
cd "$DIR/../deployment"
./run-unit-tests.sh
./build-s3-dist.sh "$BUCKET_NAME" "$SOLUTION_NAME" "$VERSION"