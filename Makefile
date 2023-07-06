SERVICE 			:= image-handler
REGION 				?= eu-west-1
APP_SUFFIX 			?=
MODE 				?= plan
DO_TF_UPGRADE 		?= false

ACCOUNT_ID 			= $(eval ACCOUNT_ID := $(shell aws --output text sts get-caller-identity --query "Account"))$(ACCOUNT_ID)
VERSION 			= $(eval VERSION := $$(shell git rev-parse --short HEAD))$(VERSION)

TF_BACKEND_CFG 		= $(eval TF_BACKEND_CFG := -backend-config=bucket=terraform-state-$(ACCOUNT_ID)-$(REGION) \
							-backend-config=region=$(REGION) \
							-backend-config=key="regional/lambda/$(SERVICE)/terraform$(APP_SUFFIX).tfstate")$(TF_BACKEND_CFG)

TF_VARS				= $(eval TF_VARS := -var="region=$(REGION)" -var="account_id=$(ACCOUNT_ID)" -var="app_suffix=$(APP_SUFFIX)")$(TF_VARS)

WORK_DIR := source/$(SERVICE)

clean ::
	@cd $(WORK_DIR) && rm -rf ./dist/ ./node_modules/

npm/install ::
	cd $(WORK_DIR) && npm install

npm/test ::
	cd $(WORK_DIR) && npm run test

build ::
	cd $(WORK_DIR) && npm run build

tf ::
	rm -f $(WORK_DIR)/terraform/.terraform/terraform.tfstate || true
	terraform -chdir=$(WORK_DIR)/terraform init $(TF_VARS) -reconfigure -upgrade=$(DO_TF_UPGRADE) $(TF_BACKEND_CFG)
	if [ "true" == "$(DO_TF_UPGRADE)" ]; then terraform -chdir=$(WORK_DIR)/terraform providers lock -platform=darwin_amd64 -platform=linux_amd64; fi
	terraform -chdir=$(WORK_DIR)/terraform $(MODE) $(TF_VARS)

invoke :: # invoke the running docker lambda by posting a sample API-GW-Event
	@echo nothing to do


upload :: build # build and push the app to production (given sufficient permissions)
	aws s3 cp $(WORK_DIR)/dist/image-handler.zip s3://ci-$(ACCOUNT_ID)-$(REGION)/image-handler/image-handler$(APP_SUFFIX).zip

all :: build tf
