TF_VAR_region ?= eu-west-1
MODE ?= plan

ACCOUNT := $(shell aws --output text sts get-caller-identity --query "Account")
VERSION := $(shell git rev-parse --short HEAD)

TF_BACKEND_CFG := -backend-config=bucket=terraform-state-$(ACCOUNT)-$(TF_VAR_region) \
	-backend-config=region=$(TF_VAR_region) \
	-backend-config=key="regional/lambda/image-handler/terraform.tfstate"

WORK_DIR := source/image-handler

clean ::
	@cd $(WORK_DIR) && rm -rf ./dist/

npm/install ::
	cd $(WORK_DIR) && npm install

npm/test ::
	cd $(WORK_DIR) && npm run test

build ::
	cd $(WORK_DIR) && npm run build

export TF_VAR_region
terraform ::
	terraform init -reconfigure -upgrade=true $(TF_BACKEND_CFG) $(WORK_DIR)/terraform/
	terraform $(MODE) $(WORK_DIR)/terraform/

docker_build ::
	docker build \
		--tag "$(ACCOUNT).dkr.ecr.$(TF_VAR_region).amazonaws.com/image-handler:production" \
		--tag "$(ACCOUNT).dkr.ecr.$(TF_VAR_region).amazonaws.com/image-handler:latest" \
		--tag "$(ACCOUNT).dkr.ecr.$(TF_VAR_region).amazonaws.com/image-handler:$(VERSION)" \
		$(WORK_DIR)

local :: docker_build # build and run the docker image locally
	docker run --rm --publish 9000:8080 \
				--env AUTO_WEBP="Yes" \
				--env SOURCE_BUCKETS="master-images-$(ACCOUNT)-$(TF_VAR_region)" \
				"$(ACCOUNT).dkr.ecr.$(TF_VAR_region).amazonaws.com/image-handler:$(VERSION)"

invoke :: # invoke the running docker lambda by posting a sample API-GW-Event
	curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d @source/image-handler/test/sample_event.json

push :: docker_build # build and push the app to production (given sufficient permissions)
	docker push --all-tags "$(ACCOUNT).dkr.ecr.$(TF_VAR_region).amazonaws.com/image-handler"

login ::
	aws --region $(TF_VAR_region) ecr get-login-password | docker login --username AWS --password-stdin $(ACCOUNT).dkr.ecr.$(TF_VAR_region).amazonaws.com

all :: build terraform