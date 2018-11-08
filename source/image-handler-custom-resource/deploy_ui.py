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
import logging
import os
import ast
import requests
import time
import boto3
from botocore.client import Config
from zipfile import ZipFile
import re

log_level = str(os.environ.get('LOG_LEVEL')).upper()
if log_level not in ['DEBUG', 'INFO','WARNING', 'ERROR','CRITICAL']:
    log_level = 'ERROR'
log = logging.getLogger()
log.setLevel(log_level)

def DeployImageHandlerUI(deploy_config):
    #Expected dict entries
    #deploy_config['UISourceURL']
    #deploy_config['UIBucket']
    #deploy_config['UIBucketRegion']
    #deploy_config['UIPrefix']
    #deploy_config['UIPublicRead']
    #deploy_config['FindReplace']
    #deploy_config['Deliminator']
    try:
        SrcBucket, SrcKey = deploy_config['UISourceURL'].split("/", 1)
        FileName = SrcKey.rsplit("/", 1)[1]
        tmpdir = '/tmp/ui/'
        log.info("%s/%s - downloading to %s%s", SrcBucket, SrcKey, tmpdir, FileName)

        #Clean up exisitng directories or files
        if os.path.exists(tmpdir):
            shutil.rmtree(tmpdir)
        os.makedirs(tmpdir)
        FilePath = "{}{}".format(tmpdir, FileName)
        if os.path.exists(FilePath):
            os.remove(FilePath)

        s3 = boto3.client("s3", config=Config(signature_version='s3v4'))
        s3.download_file(SrcBucket, SrcKey, FilePath)
        log.info("File downloaded to %s", FilePath)
        log.info("Extracting %s to %s", FilePath, tmpdir)
        zipf = ZipFile(FilePath, 'r')
        zipf.extractall(tmpdir)
        zipf.close()
        log.info("Deleting %s", FilePath)
        os.remove(FilePath)

        if 'FindReplace' in deploy_config:
            FilePath = tmpdir+"index.html"
            index_html = ''
            log.info("Opening %s", FilePath)
            indexfile = open(FilePath, 'r')
            log.info("Reading %s", FilePath)
            for line in indexfile:
                for fr in deploy_config['FindReplace'].split(','):
                    f, r = fr.split(deploy_config['Deliminator'])
                    line = line.replace(f, r)
                index_html += line
            indexfile.close()
            log.info("Writing changed file")
            indexfile = open(FilePath, 'w')
            indexfile.write(index_html)
            indexfile.close()

            log.info("Uploading %s/* to %s/%s", tmpdir, deploy_config['UIBucket'], deploy_config['UIPrefix'])
            # Grant bucket owner full control of objects (in case this is deployed to another account's bucket)
            extraArgs = {'ACL':'bucket-owner-full-control'}
            log.debug("ExtraArgs = %s", extraArgs)
            for root, dirs, files in os.walk(tmpdir):
                for filename in files:
                    # construct the full local path
                    local_path = os.path.join(root, filename)
                    # construct the full UI path
                    relative_path = os.path.relpath(local_path, tmpdir)
                    s3_path = os.path.join(deploy_config['UIPrefix'], relative_path)
                    log.debug("local_path = %s; relative_path = %s", local_path, relative_path)
                    log.info("Uploading %s...", s3_path)
                    # Setting content type
                    if filename.endswith('.htm') or filename.endswith('.html'):
                        extraArgs.update({"ContentType": "text/html"})
                    if filename.endswith('.css'):
                        extraArgs.update({"ContentType": "text/css"})
                    if filename.endswith('.js'):
                        extraArgs.update({"ContentType": "application/javascript"})
                    if filename.endswith('.png'):
                        extraArgs.update({"ContentType": "image/png"})
                    if filename.endswith('.jpeg') or filename.endswith('.jpg'):
                        extraArgs.update({"ContentType": "image/jpeg"})
                    if filename.endswith('.gif'):
                        extraArgs.update({"ContentType": "image/gif"})
                    s3.upload_file(Filename=local_path, Bucket=deploy_config['UIBucket'], Key=s3_path, ExtraArgs=extraArgs)
    except Exception as e:
        log.error("Error uploading UI. Error: %s", e)
        raise

def DeleteImageHandlerUI(deploy_config):
    #Expected dict entries
    #deploy_config['UIBucket']
    #deploy_config['UIPrefix']
    log.info("Deleting Serverless Image Handler UI from %s/%s", deploy_config['UIBucket'], deploy_config['UIPrefix'])
    try:
        s3 = boto3.client("s3", config=Config(signature_version='s3v4'))
        log.info("Listing UI objects in %s/%s", deploy_config['UIBucket'], deploy_config['UIPrefix'])
        for s3object in s3.list_objects(Bucket=deploy_config['UIBucket'], Prefix=deploy_config['UIPrefix'])['Contents']:
            log.info("Deleting %s/%s", deploy_config['UIBucket'], s3object['Key'])
            s3.delete_object(Bucket=deploy_config['UIBucket'], Key=s3object['Key'])
        log.info("Deleting %s/%s", deploy_config['UIBucket'], deploy_config['UIPrefix'])
        s3.delete_object(Bucket=deploy_config['UIBucket'], Key=deploy_config['UIPrefix'])
    except Exception as e:
        log.error("Error deleting UI. Error: %s", e)
        raise

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
        log.error("Error sending FAILED response message: %s", e)
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
        log.error("Error sending SUCCESS response", e)
        raise

def createApplication(event,context):
    # Create S3 client, download the UI, and push it to the customer's bucket
    resourceId=""
    try:
        deploy = ast.literal_eval(event['ResourceProperties']['DeployUI'])
        resourceId=deploy['UIBucket']+'/'+deploy['UIPrefix']
        DeployImageHandlerUI(deploy)
        # Only send response if the RequestType was a Create
        if event['RequestType'] == 'Create':
            sendResponse(event, resourceId)
    except Exception as e:
        log.error(e)
        sendFailedResponse(event, resourceId, "Failed to deploy Image Handler UI")

def deleteApplication(event, context):
    resourceId = event['PhysicalResourceId']
    #Create an S3 client and remove UI
    try:
        deploy = ast.literal_eval(event['ResourceProperties']['DeployUI'])
        DeleteImageHandlerUI(deploy)
        if event['RequestType'] == 'Delete':
            sendResponse(event, resourceId)
    except Exception as e:
        # If the try fails, send failure
        log.error(e)
        time.sleep(30)
        sendFailedResponse(event, resourceId, "Failed to delete "+resourceId)

def updateApplication(event,context):
    resourceId = event['PhysicalResourceId']
    # When called to update, we will simply replace old with new
    try:
        deleteApplication(event,context)
        createApplication(event,context)
        sendResponse(event, resourceId)
    except Exception as e:
        # If the try fails, send failure
        log.error(e)
        sendFailedResponse(event, resourceId, "Failed to update "+resourceId)
