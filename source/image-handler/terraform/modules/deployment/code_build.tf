resource "aws_cloudwatch_log_group" "this" {
  count             = var.enabled ? 1 : 0
  name              = "/aws/codebuild/${var.function_name}-deployment"
  retention_in_days = 7

  tags = merge(var.tags, {
    tf_module = basename(path.module)
  })
}

resource "aws_codebuild_project" "this" {
  count        = var.enabled ? 1 : 0
  name         = "${var.function_name}-deployment"
  service_role = var.code_build_role == "" ? aws_iam_role.code_build_role[count.index].arn : data.aws_iam_role.code_build[count.index].arn

  tags = merge(var.tags, {
    tf_module = basename(path.module)
  })

  artifacts {
    type                = "CODEPIPELINE"
    artifact_identifier = "deploy_output"
    location            = "appspec.json"
  }

  logs_config {
    cloudwatch_logs {
      group_name = aws_cloudwatch_log_group.this[count.index].name
      status     = "ENABLED"
    }

    s3_logs {
      status = "DISABLED"
    }
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/amazonlinux2-x86_64-standard:3.0"
    type         = "LINUX_CONTAINER"
    environment_variable {
      name  = "FUNCTION_NAME"
      value = var.function_name
    }
    environment_variable {
      name  = "REGION"
      value = data.aws_region.current.name
    }
    environment_variable {
      name  = "ALIAS_NAME"
      value = var.alias_name
    }
    environment_variable {
      name  = "DEPLOYMENT_GROUP_NAME"
      value = aws_codedeploy_deployment_group.this.deployment_group_name
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = <<EOF
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.8
    commands:
      - pip install --upgrade pip
      - pip install 'boto3>=1.16.52' --force-reinstall
  build:
    commands:
      - |
        cat << BUILD > build.py
        import boto3
        import json
        import sys
        import os
        import hashlib

        print(f"boto3 version {boto3.__version__}")

        img_uri = json.load(sys.stdin)["ImageURI"]

        lambda_function_name = os.environ.get("FUNCTION_NAME")
        lambda_alias = os.environ.get("ALIAS_NAME")
        deployment_group_name = os.environ.get("DEPLOYMENT_GROUP_NAME")

        lambda_client = boto3.client("lambda", region_name=os.environ.get("REGION"))
        deploy_client = boto3.client("codedeploy", region_name=os.environ.get("REGION"))

        if lambda_alias:
            current_version = lambda_client.get_alias(
                FunctionName=lambda_function_name, Name=lambda_alias)["FunctionVersion"]
        else:
            current_version = lambda_client.get_function(
                FunctionName=lambda_function_name)["Configuration"]["Version"]

        target_version = lambda_client.update_function_code(
            FunctionName=lambda_function_name, ImageUri=img_uri, Publish=True)["Version"]

        print(f"current version={current_version} target version={target_version} img uri={img_uri}")

        data = {
            "version": 0.0,
            "Resources": [{
                lambda_function_name: {
                    "Type": "AWS::Lambda::Function",
                    "Properties": {
                        "Name": lambda_function_name,
                        "CurrentVersion": current_version,
                        "TargetVersion": target_version
                    }
                }
            }],
            # "Hooks": [{
            #     "BeforeAllowTraffic": "LambdaFunctionToValidateBeforeTrafficShift"
            # },
            #     {
            #         "AfterAllowTraffic": "LambdaFunctionToValidateAfterTrafficShift"
            #     }
            # ]
        }
        if lambda_alias:
            data["Resources"][0][lambda_function_name]["Properties"].update(
                {"Alias": lambda_alias})


        revision = {
            "revisionType": "AppSpecContent",
            "appSpecContent": {
                "content": json.dumps(data),
                "sha256": hashlib.sha256(json.dumps(data).encode("utf-8")).hexdigest()
            }
        }
        # with open("app_spec.json", "w") as outfile:
        #    json.dump(data, outfile)

        # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/codedeploy.html#CodeDeploy.Client.create_deployment
        deployment_id = deploy_client.create_deployment(
            applicationName=lambda_function_name,
            deploymentGroupName=deployment_group_name,
            revision=revision
        )["deploymentId"]

        print(f"deployment was created. id = {deployment_id}")
        BUILD

        cat imageDetail.json | python build.py
EOF
  }
}

/* Sample Input imageDetail.json
{
    "ImageSizeInBytes": "50801513",
    "ImageDigest": "sha256:c3f76d75ee2150c7732b2b9c563234563550855c9f25f35cdd6754114c180cf9",
    "Version": "1.0",
    "ImagePushedAt": "Thu Oct 31 13:19:48 UTC 2019",
    "RegistryId": "053041861227",
    "RepositoryName": "code-deploy-sample",
    "ImageURI": "053041861227.dkr.ecr.eu-west-1.amazonaws.com/peruggia-pub@sha256:b607a430c21198a5583ecf573bfabedd2641960b20dcd0501d6f332bcce57716",
    "ImageTags": [
        "latest"
    ]
}
*/

/* Sample output https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-example.html#appspec-file-example-lambda

{
 	"version": 0.0,
 	"Resources": [{
 		"myLambdaFunction": {
 			"Type": "AWS::Lambda::Function",
 			"Properties": {
 				"Name": "myLambdaFunction",
 				"Alias": "myLambdaFunctionAlias",
 				"CurrentVersion": "1",
 				"TargetVersion": "2"
 			}
 		}
 	}],
 	"Hooks": [{
 			"BeforeAllowTraffic": "LambdaFunctionToValidateBeforeTrafficShift"
      },
      {
 			"AfterAllowTraffic": "LambdaFunctionToValidateAfterTrafficShift"
 		}
 	]
 }

*/
