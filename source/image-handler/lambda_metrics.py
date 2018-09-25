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

import datetime
import json
import logging
import os
import timeit
from urllib2 import Request
from urllib2 import urlopen
from setuptools import setup, find_packages
from pkg_resources import get_distribution
from thumbor.url import Url


def send_data(event, result, start_time):
    time_now = datetime.datetime.utcnow().isoformat()
    time_stamp = str(time_now)
    postDict = {}
    size = '-'
    filters = Url.parse_decrypted(event['path'])
    del filters['image']
    if int(result['statusCode']) == 200:
        size = (len(result['body'] * 3)) / 4
    postDict['Data'] = {
        'Version': get_distribution('image_handler').version,
        'Company': 'AWS',
        'Name': 'AWS Serverless Image Handler',
        'Region': os.environ.get('AWS_DEFAULT_REGION'),
        'Filters': filters,
        'StatusCode': result['statusCode'],
        'ResponseSize': size,
        'ResponseTime': round(timeit.default_timer() - start_time, 3)
    }
    postDict['TimeStamp'] = time_stamp
    postDict['Solution'] = 'SO0023'
    postDict['UUID'] = os.environ.get('UUID')
    # API Gateway URL to make HTTP POST call
    url = 'https://metrics.awssolutionsbuilder.com/generic'
    data = json.dumps(postDict)
    headers = {'content-type': 'application/json'}
    req = Request(url, data, headers)
    rsp = urlopen(req)
    content = rsp.read()
    rspcode = rsp.getcode()
    logging.debug('Response Code: {}'.format(rspcode))
    logging.debug('Response Content: {}'.format(content))
    return req
