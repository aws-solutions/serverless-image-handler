SERVICE := image-handler
TF_VAR_region ?= eu-west-1
MODE ?= plan

ACCOUNT = $(eval ACCOUNT := $$(shell aws --output text sts get-caller-identity --query "Account"))$(ACCOUNT)
VERSION = $(eval VERSION := $$(shell git rev-parse --short HEAD))$(VERSION)

TF_BACKEND_CFG = $(eval TF_BACKEND_CFG := -backend-config=bucket=terraform-state-$(ACCOUNT)-$(TF_VAR_region) \
	-backend-config=region=$(TF_VAR_region) \
	-backend-config=key="regional/lambda/$(SERVICE)/terraform.tfstate")$(TF_BACKEND_CFG)

WORK_DIR := source/$(SERVICE)

clean ::
	@cd $(WORK_DIR) && rm -rf ./dist/

npm/install ::
	cd $(WORK_DIR) && npm install

npm/test ::
	cd $(WORK_DIR) && npm run test

build ::
	cd $(WORK_DIR) && npm run build

export TF_VAR_region
export TF_VAR_docker_image_tag
tf ::
	terraform -chdir=$(WORK_DIR)/terraform/ init -reconfigure -upgrade=true $(TF_BACKEND_CFG)
	terraform -chdir=$(WORK_DIR)/terraform/ $(MODE)

invoke :: # invoke the running docker lambda by posting a sample API-GW-Event


upload :: build # build and push the app to production (given sufficient permissions)
	aws s3 cp $(WORK_DIR)/dist/image-handler.zip s3://ci-$(ACCOUNT)-$(TF_VAR_region)/image-handler/image-handler.zip

all :: build tf
