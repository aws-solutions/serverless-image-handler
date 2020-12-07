TF_VAR_region ?= eu-west-1
export TF_VAR_region
MODE ?= plan
ACCOUNT := $(shell aws --output text sts get-caller-identity --query "Account")
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

inplace :: build
	aws s3 cp $(WORK_DIR)/dist/image-handler.zip s3://lambda-image-handler-$(ACCOUNT)-$(TF_VAR_region)/deployment/image-handler.zip

terraform ::
	terraform init -reconfigure -upgrade=true $(TF_BACKEND_CFG) $(WORK_DIR)/terraform/
	terraform $(MODE) $(WORK_DIR)/terraform/

all :: build terraform