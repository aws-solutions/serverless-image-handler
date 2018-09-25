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

import json
import requests
import logging
import os
import uuid
import time

log_level = str(os.environ.get('LOG_LEVEL')).upper()
if log_level not in ['DEBUG', 'INFO','WARNING', 'ERROR','CRITICAL']:
    log_level = 'ERROR'
log = logging.getLogger()
log.setLevel(log_level)

def createUniqueID():
    log.info("Creating Unique ID")
    # Generate new random Unique ID
    uniqueID = uuid.uuid4()
    log.debug("UUID: %s", uniqueID)
    return uniqueID

def sendFailedResponse(event, resourceId, reason):
    responseBody = {'Status': "FAILED",
                    'PhysicalResourceId': resourceId,
                    'Reason': reason,
                    'StackId': event['StackId'],
                    'RequestId': event['RequestId'],
                    'LogicalResourceId': event['LogicalResourceId']}
    log.info('RESPONSE BODY:n' + json.dumps(responseBody))
    try:
        requests.put(event['ResponseURL'], data=json.dumps(responseBody))
        return
    except Exception as e:
        log.error(e)
        raise

def sendResponse(event, solution_uuid):
    responseBody =  {
                        'Status': 'SUCCESS',
                        'PhysicalResourceId': solution_uuid,
                        'StackId': event['StackId'],
                        'RequestId': event['RequestId'],
                        'LogicalResourceId': event['LogicalResourceId'],
                        'Data': { "UUID": solution_uuid }
                    }
    log.info('RESPONSE BODY:n' + json.dumps(responseBody))
    try:
        requests.put(event['ResponseURL'], data=json.dumps(responseBody))
        return
    except Exception as e:
        log.error(e)
        raise

def createApplication(event,context):
    new_uuid = str(createUniqueID())
    try:
        sendResponse(event, new_uuid)
    except Exception as e:
        log.error(e)
        sendFailedResponse(event, new_uuid, "Failed to create UUID")

def deleteApplication(event, context):
    prev_uuid = event['PhysicalResourceId']
    try:
        sendResponse(event, prev_uuid)
    except Exception as e:
        # If the try fails, send failure
        log.error(e)
        time.sleep(30)
        sendFailedResponse(event, prev_uuid, "Failed to delete "+prev_uuid)

def updateApplication(event,context):
    prev_uuid = event['PhysicalResourceId']
    try:
        sendResponse(event, prev_uuid)
    except Exception as e:
        # If the try fails, send failure
        log.error(e)
        sendFailedResponse(event, prev_uuid, "Failed to update "+prev_uuid)
