#!/usr/bin/env bash
set -euo pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# If AWS_PROFILE is set already, use it.
if [ -n "${AWS_PROFILE:-}" ]; then
	echo "Using the current AWS_PROFILE ($AWS_PROFILE)!"
# If AWS session token is defined, assume it's a valid session.
elif [ -n "${AWS_SESSION_TOKEN:-}" ]; then
	echo "Using an AWS session found from the current environment!"
# If no session was found from environment (e.g. in VS Code), try loading the .active-profile
else
	# shellcheck source=/dev/null
	source "$DIR/../../ecom-infrastructure/.active-profile"

	# Check that AWS Profile is not missing.
	[[ -z "${AWS_PROFILE:-}" ]] && {
		echo "AWS_PROFILE is not set"
		exit 1
	}

	echo "Using current active profile ($AWS_PROFILE)"
fi

VERSION=$( jq -r '.version' "$DIR/../source/package.json" )
BUCKET_NAME="grano-serverless-image-handler-bucket"
REGION="eu-west-1"
SOLUTION_NAME="grano-serverless-image-handler"

export VERSION BUCKET_NAME REGION SOLUTION_NAME