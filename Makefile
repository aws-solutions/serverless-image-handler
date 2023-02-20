SERVICE := image-handler
TF_VAR_region ?= eu-west-1
TF_VAR_app_suffix ?=
MODE ?= plan
DO_TF_UPGRADE ?= false

ACCOUNT 			= $(eval ACCOUNT := $(shell aws --output text sts get-caller-identity --query "Account"))$(ACCOUNT)
VERSION 			= $(eval VERSION := $$(shell git rev-parse --short HEAD))$(VERSION)

TF_BACKEND_CFG 		:= -backend-config=bucket=terraform-state-${ACCOUNT}-$${TF_VAR_region} \
						-backend-config=region=$${TF_VAR_region} \
						-backend-config=key="regional/lambda/$(SERVICE)/terraform$(TF_VAR_app_suffix).tfstate"

WORK_DIR := source/$(SERVICE)

clean ::
	@cd $(WORK_DIR) && rm -rf ./dist/ ./node_modules/

npm/install ::
	cd $(WORK_DIR) && npm install

npm/test ::
	cd $(WORK_DIR) && npm run test

build ::
	cd $(WORK_DIR) && npm run build

export TF_VAR_region
export TF_VAR_app_suffix
tf ::
	rm -f $(WORK_DIR)/terraform/.terraform/terraform.tfstate || true
	terraform -chdir=$(WORK_DIR)/terraform init -reconfigure -upgrade=$(DO_TF_UPGRADE) $(TF_BACKEND_CFG)
	if [ "true" == "$(DO_TF_UPGRADE)" ]; then terraform -chdir=$(WORK_DIR)/terraform providers lock -platform=darwin_amd64 -platform=linux_amd64; fi
	terraform -chdir=$(WORK_DIR)/terraform $(MODE)

invoke :: # invoke the running docker lambda by posting a sample API-GW-Event


upload :: build # build and push the app to production (given sufficient permissions)
	aws s3 cp $(WORK_DIR)/dist/image-handler.zip s3://ci-$(ACCOUNT)-$(TF_VAR_region)/image-handler/image-handler$(TF_VAR_app_suffix).zip

all :: build tf
