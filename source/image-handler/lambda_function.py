#!/usr/bin/python
# -*- coding: utf-8 -*-
##############################################################################
#  Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.   #
#                                                                            #
#  Licensed under the Amazon Software License (the "License"). You may not   #
#  use this file except in compliance with the License. A copy of the        #
#  License is located at                                                     #
#                                                                            #
#      http://aws.amazon.com/asl/                                            #
#                                                                            #
#  or in the "license" file accompanying this file. This file is distributed #
#  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,        #
#  express or implied. See the License for the specific language governing   #
#  permissions and limitations under the License.                            #
##############################################################################

from __future__ import print_function
import cStringIO
import base64
import requests_unixsocket
import threading
import time
import mimetypes
import traceback
import os.path
import json
import os
import timeit
from image_handler import lambda_metrics
from image_handler import lambda_rewrite
from PIL import Image
from io import BytesIO

from tornado.httpserver import HTTPServer
from tornado.netutil import bind_unix_socket
from tornado.options import options, define

from thumbor.console import get_server_parameters
from thumbor.context import ServerParameters
from thumbor.server import *

thumbor_config_path = '/var/task/image_handler/thumbor.conf'
thumbor_socket = '/tmp/thumbor'


def response_formater(status_code='400',
                      body={'message': 'error'},
                      cache_control='max-age=120,public',
                      content_type='application/json',
                      expires='',
                      etag='',
                      date=''):

    api_response = {
        'statusCode': status_code,
        'headers': {
            'Content-Type': content_type
        }
    }

    if str(os.environ.get('ENABLE_CORS')).upper() == "YES":
        api_response['headers']['Access-Control-Allow-Origin'] = os.environ.get('CORS_ORIGIN')

    if int(status_code) != 200:
        api_response['body'] = json.dumps(body)
        api_response['Cache-Control'] = cache_control
    else:
        api_response['body'] = body
        api_response['isBase64Encoded'] = 'true'
        api_response['headers']['Expires'] = expires
        api_response['headers']['Etag'] = etag
        api_response['headers']['Cache-Control'] = cache_control
        api_response['headers']['Date'] = date
    logging.debug(api_response)
    return api_response

def run_server(application, context):
    server = HTTPServer(application)
    define(
        'unix_socket',
        group='webserver',
        default=thumbor_socket,
        help='Path to unix socket to bind')
    socket = bind_unix_socket(options.unix_socket)
    server.add_socket(socket)
    server.start(1)


def stop_thumbor():
    return None
    tornado.ioloop.IOLoop.instance().stop()
    try:
        os.remove(thumbor_socket)
    except OSError as error:
        logging.error('stop_thumbor error: %s' % (error))


def start_thumbor():
    try:
        server_parameters = ServerParameters(
            port=8888,
            ip='0.0.0.0',
            config_path=None,
            keyfile=False,
            log_level=log_level,
            app_class='thumbor.app.ThumborServiceApp')
        global config
        config = get_config(thumbor_config_path)
        config.allow_environment_variables()
        configure_log(config, server_parameters.log_level)
        importer = get_importer(config)
        validate_config(config, server_parameters)
        with get_context(server_parameters, config, importer) as context:
            application = get_application(context)
            run_server(application, context)
            tornado.ioloop.IOLoop.instance().start()
            logging.info(
                        'thumbor running at %s:%d' %
                        (context.server.ip, context.server.port)
                        )
            return config
    except RuntimeError as error:
        if str(error) != "IOLoop is already running":
            logging.error('start_thumbor RuntimeError: %s' % (error))
            stop_thumbor()
    except Exception as error:
        stop_thumbor()
        logging.error('start_thumbor error: %s' % (error))
        logging.error('start_thumbor trace: %s' % traceback.format_exc())


def start_server():
    t = threading.Thread(target=start_thumbor)
    t.daemon = True
    t.start()
    return t


def restart_server():
    threads = threading.enumerate()
    main_thread = threading.current_thread()
    for t in threads:
        if t is not main_thread:
            t.exit()
            t.join()
    start_server()


def call_thumbor(request):
    if not os.path.exists(thumbor_socket):
        start_server()
    session = requests_unixsocket.Session()
    unix_path = 'http+unix://%2Ftmp%2Fthumbor'
    http_health = '/healthcheck'
    retries = 10
    while(retries > 0):
        try:
            response = session.get(unix_path + http_health)
            if (response.status_code == 200):
                break
        except Exception as error:
            time.sleep(0.03)
            retries -= 1
            continue
    if retries <= 0:
        logging.error(
            'call_thumbor error: tornado server unavailable,\
            proceeding with tornado server restart'
        )
        restart_server()
        return response_formater(status_code='502')
    http_path = request['path']
    if str(os.environ.get('REWRITE_ENABLED')).upper() == 'YES':
        http_path = lambda_rewrite.match_patterns(http_path)
    if config.ALLOW_UNSAFE_URL:
        http_path = '/unsafe' + http_path
    else:
        http_path = http_path
    response = session.get(unix_path + http_path)
    if response.status_code != 200:
        return response_formater(status_code=response.status_code)
    content_type = response.headers['content-type']
    body = gen_body(content_type, response.content)
    if body is None:
        return response_formater(status_code='500',
                                 cache_control='no-cache,no-store')
    return response_formater(status_code='200',
                             body=body,
                             cache_control=response.headers['Cache-Control'],
                             content_type=content_type,
                             expires=response.headers['Expires'],
                             etag=response.headers['Etag'],
                             date=response.headers['Date'])


def gen_body(ctype, content):
    '''Convert image to base64 to be sent as body response. '''
    try:
        format_ = ctype[ctype.find('/')+1:]
        supported = ['jpeg', 'png', 'gif']
        if format_ not in supported:
            None
        buffer_ = cStringIO.StringIO()
        image = Image.open(BytesIO(content))
        image.save(buffer_, format_)
        return base64.b64encode(buffer_.getvalue())
    except Exception as error:
        logging.error('gen_body error: %s' % (error))
        logging.error('gen_body trace: %s' % traceback.format_exc())
        return None


def send_metrics(event, result, start_time):
    t = threading.Thread(
        target=lambda_metrics.send_data,
        args=(event, result, start_time, )
    )
    t.start()
    return t

def lambda_handler(event, context):
    try:
        start_time = timeit.default_timer()
        global log_level
        log_level = str(os.environ.get('LOG_LEVEL')).upper()
        if log_level not in [
                                'DEBUG', 'INFO',
                                'WARNING', 'ERROR',
                                'CRITICAL'
                            ]:
            log_level = 'ERROR'
        logging.getLogger().setLevel(log_level)
        if event['requestContext']['httpMethod'] != 'GET' and\
           event['requestContext']['httpMethod'] != 'HEAD':
            return response_formater(status_code=405)
        result = call_thumbor(event)
        if str(os.environ.get('SEND_ANONYMOUS_DATA')).upper() == 'YES':
            send_metrics(event, result, start_time)
        return result
    except Exception as error:
        logging.error('lambda_handler error: %s' % (error))
        logging.error('lambda_handler trace: %s' % traceback.format_exc())
        return response_formater(status_code='500',
                                 cache_control='no-cache,no-store')
