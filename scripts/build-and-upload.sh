#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VERSION=$( jq -r '.version' "$DIR/../source/package.json" )
BUCKET_NAME="serverless-image-handler-deployment-bucket"
REGION="eu-west-1"
SOLUTION_NAME="grano-serverless-image-handler"
S3_PATH="s3://$BUCKET_NAME/$SOLUTION_NAME/$VERSION/"

# Choose the active AWS profile if it's set.
if [[ -f "$DIR/../../ecom-infrastructure/.active-profile" ]]; then
	# shellcheck source=.active-profile disable=SC1091
	source "$DIR/../../ecom-infrastructure/.active-profile"
	echo "Using AWS profile $AWS_PROFILE"
else
	echo "Using AWS profile ${AWS_PROFILE:-default}"
fi

cd "$DIR/../deployment"

export VERSION REGION BUCKET_NAME SOLUTION_NAME
./run-unit-tests.sh
./build-s3-dist.sh "$BUCKET_NAME" "$SOLUTION_NAME" "$VERSION"

echo "------------------------------------------------------------------------------"
echo "[Sync] Upload built files to $S3_PATH"
echo "------------------------------------------------------------------------------"

aws s3 sync --sse AES256 regional-s3-assets/ "$S3_PATH" >&2
aws s3 sync --sse AES256 global-s3-assets/ "$S3_PATH" >&2