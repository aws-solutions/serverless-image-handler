BNET_CODEBUILD_GIT_REPO=serverless-image-handler
S3_BUCKET=410935837022-codebuild-resources-bucket

build-serverless-image-handler:
	sam build -b .aws-sam/serverless-image-handler -t template.yml --use-container

package-serverless-image-handler:
	sam package --s3-bucket ${S3_BUCKET} --s3-prefix ${BNET_CODEBUILD_GIT_REPO}/serverless-image-handler --template-file .aws-sam/serverless-image-handler/template.yaml --output-template-file .aws-sam/serverless-image-handler/packaged.yaml 

build: build-serverless-image-handler package-serverless-image-handler

upload:
	echo "${TAG}" > .tag
	zip -r artifacts.zip .aws-sam/*/packaged.yaml .tag codepipeline
	aws s3 cp . s3://${S3_BUCKET}/${BNET_CODEBUILD_GIT_REPO}/ --metadata '{"codepipeline-artifact-revision-summary":"'${TAG}' | Git Commit '${BNET_CODEBUILD_GIT_SHORT_COMMIT}'"}' --recursive --exclude=* --include=*.zip

clean:
	rm ./artifacts.zip