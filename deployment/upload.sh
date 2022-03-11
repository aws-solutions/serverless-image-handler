#!/bin/bash
[ "$DEBUG" == 'true' ] && set -x
. .env
set -e

./build-s3-dist.sh $BUCKET_PREFIX $SOLUTION_NAME $VERSION

aws s3 cp regional-s3-assets s3://$BUCKET_NAME/$SOLUTION_NAME/$VERSION --recursive
aws s3 cp global-s3-assets s3://$BUCKET_NAME/$SOLUTION_NAME/$VERSION --recursive