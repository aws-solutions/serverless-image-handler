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

import datetime
import json
import logging
import os
import ast
import requests
import time
from urllib2 import Request
from urllib2 import urlopen

log_level = str(os.environ.get('LOG_LEVEL')).upper()
if log_level not in ['DEBUG', 'INFO','WARNING', 'ERROR','CRITICAL']:
    log_level = 'ERROR'
log = logging.getLogger()
log.setLevel(log_level)

def send_data(event):
    log.debug('Starting send data')
    time_now = datetime.datetime.utcnow().isoformat()
    time_stamp = str(time_now)
    postDict = {}
    log.debug('CFNRequestType = %s', event['RequestType'])
    postDict = ast.literal_eval(event['ResourceProperties']['SendAnonymousData'])
    log.debug("postDict = %s", postDict)
    postDict['Data'].update({'CFTemplate':event['RequestType']})
    postDict['Data'].update({'Company':'AWS'})
    postDict['Data'].update({'Name':'AWS Serverless Image Handler'})
    log.debug("postDict['Data'] = %s", postDict['Data'])
    postDict['TimeStamp'] = time_stamp
    postDict['Solution'] = 'SO0023'
    log.info("Posing the following: %s", postDict)
    # API Gateway URL to make HTTP POST call
    url = 'https://metrics.awssolutionsbuilder.com/generic'
    data = json.dumps(postDict)
    headers = {'content-type': 'application/json'}
    req = Request(url, data, headers)
    rsp = urlopen(req)
    content = rsp.read()
    rspcode = rsp.getcode()
    log.info('Response Code: {}'.format(rspcode))
    log.debug('Response Content: {}'.format(content))

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

def sendResponse(event, resourceId):
    responseBody =  {
                        'Status': 'SUCCESS',
                        'PhysicalResourceId': resourceId,
                        'StackId': event['StackId'],
                        'RequestId': event['RequestId'],
                        'LogicalResourceId': event['LogicalResourceId']
                    }
    log.info('RESPONSE BODY:n' + json.dumps(responseBody))
    try:
        requests.put(event['ResponseURL'], data=json.dumps(responseBody))
        return
    except Exception as e:
        log.error(e)
        raise

def createApplication(event,context):
    resourceId = context.log_stream_name
    try:
        log.debug("Sending Create event data: %s", event)
        send_data(event)
        log.debug("Sending successful Create response")
        sendResponse(event, resourceId)
    except Exception as e:
        log.error(e)
        sendFailedResponse(event, resourceId, "Failed to send data")

def deleteApplication(event, context):
    resourceId = event['PhysicalResourceId']
    try:
        log.debug("Sending Delete event data: %s", event)
        send_data(event)
        log.debug("Sending successful Delete response")
        sendResponse(event, resourceId)
    except Exception as e:
        # If the try fails, send failure
        log.error(e)
        time.sleep(30)
        sendFailedResponse(event, resourceId, "Failed to delete "+resourceId)

def updateApplication(event,context):
    resourceId = event['PhysicalResourceId']
    try:
        log.debug("Nothing to update - sending successful Update response")
        sendResponse(event, resourceId)
    except Exception as e:
        # If the try fails, send failure
        log.error(e)
        sendFailedResponse(event, resourceId, "Failed to update "+resourceId)
