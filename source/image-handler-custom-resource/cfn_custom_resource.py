#!/usr/bin/python
# -*- coding: utf-8 -*-

##############################################################################
#  Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.   #
#                                                                            #
#  Licensed under the Amazon Software License (the 'License'). You may not   #
#  use this file except in compliance with the License. A copy of the        #
#  License is located at                                                     #
#                                                                            #
#      http://aws.amazon.com/asl/                                            #
#                                                                            #
#  or in the 'license' file accompanying this file. This file is distributed #
#  on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,        #
#  express or implied. See the License for the specific language governing   #
#  permissions and limitations under the License.                            #
##############################################################################
from __future__ import print_function

import logging
import os
from image_handler_custom_resource import create_uuid
from image_handler_custom_resource import launch_metrics
from image_handler_custom_resource import deploy_ui

log_level = str(os.environ.get('LOG_LEVEL')).upper()
if log_level not in ['DEBUG', 'INFO','WARNING', 'ERROR','CRITICAL']:
    log_level = 'ERROR'
log = logging.getLogger()
log.setLevel(log_level)

def lambda_handler(event, context):
    log.debug("event['ResourceProperties']: %s", event['ResourceProperties'])

    if 'CreateUniqueID' in event['ResourceProperties']:
        newResource = create_uuid
    if 'SendAnonymousData' in event['ResourceProperties']:
        newResource = launch_metrics
    if 'DeployUI' in event['ResourceProperties']:
        newResource = deploy_ui

    if event['RequestType'] == 'Create':
        newResource.createApplication(event,context)
    if event['RequestType'] == 'Delete':
        newResource.deleteApplication(event, context)
    if event['RequestType'] == 'Update':
        newResource.updateApplication(event,context)
