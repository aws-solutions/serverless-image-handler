#!/usr/bin/env bash
set -eo pipefail

[[ "$1" != "create" && "$1" != "update" ]] && { echo "Pass 'create' or 'update' as the first argument"; exit 1; }

ACTION="$1"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source "$DIR/setup.sh"

IDENTITY_ARN="$(aws sts get-caller-identity | jq -r '.Arn')"
if [[ ! "$IDENTITY_ARN" =~ ^arn:aws:sts::897068463773:assumed-role\/DelegatedAdmin ]]; then
	# Check that it's the correct profile.
	echo "The current aws session ($PROFILE_DESC) does not have Grano Shared admin privileges"
	exit 1
fi

CONFIG="$DIR/../configurations/grano-serverless-image-handler.json"
PARAMS=$(jq "[.Parameters | to_entries[] | { ParameterKey: .key, ParameterValue: .value }]" "$CONFIG")
TAGS=$(jq '[.Tags | to_entries[] | { Key: .key, Value: .value }]' "$CONFIG")
POLICY=$(jq '.StackPolicy' "$CONFIG")
TEMPLATE_URL="https://s3.$REGION.amazonaws.com/$BUCKET_NAME-$REGION/$SOLUTION_NAME/$VERSION"

aws cloudformation "$ACTION-stack" \
	--capabilities CAPABILITY_IAM \
	--stack-name grano-serverless-image-handler \
	--template-url "$TEMPLATE_URL/grano-serverless-image-handler.template" \
	--parameters "$PARAMS" \
	--tags "$TAGS" \
	--stack-policy-body "$POLICY" \
	--region eu-west-1 \
	--output text | cat