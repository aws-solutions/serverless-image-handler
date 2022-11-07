#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$DIR/setup.sh"
S3_PATH="s3://$BUCKET_NAME-$REGION/$SOLUTION_NAME/$VERSION/"
echo "Upload files to $S3_PATH"
aws s3 sync --sse AES256 "$DIR/../deployment/regional-s3-assets/" "$S3_PATH" >&2
aws s3 sync --sse AES256 "$DIR/../deployment/global-s3-assets/" "$S3_PATH" >&2