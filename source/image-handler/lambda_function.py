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
import ast
from image_handler import lambda_metrics
from image_handler import lambda_rewrite
from PIL import Image
from io import BytesIO
from distutils.util import strtobool

from tornado.httpserver import HTTPServer
from tornado.netutil import bind_unix_socket
from tornado.options import options, define

from thumbor.console import get_server_parameters
from thumbor.context import ServerParameters
from thumbor.server import *

thumbor_config_path = '/var/task/image_handler/thumbor.conf'
thumbor_socket = '/tmp/thumbor'
unix_path = 'http+unix://%2Ftmp%2Fthumbor'


def response_formater(status_code='400',
                      body={'message': 'error'},
                      cache_control='max-age=120,public',
                      content_type='application/json',
                      expires='',
                      etag='',
                      date='',
                      vary=False
                      ):

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
    if vary:
        api_response['headers']['Vary'] = vary
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
        os.environ["PATH"] += os.pathsep + '/var/task'
        validate_config(config, server_parameters)
        with get_context(server_parameters, config, importer) as thumbor_context:
            application = get_application(thumbor_context)
            run_server(application, thumbor_context)
            tornado.ioloop.IOLoop.instance().start()
            logging.info(
                        'thumbor running at %s:%d' %
                        (thumbor_context.server.ip, thumbor_context.server.port)
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


def auto_webp(original_request, request_headers):
    headers = {'Accept':'*/*'}
    vary = bool(strtobool(str(config.AUTO_WEBP)))
    if vary:
        if original_request.get('headers'):
            if original_request['headers'].get('Accept'):
                request_headers['Accept'] = original_request['headers']['Accept']
    return vary, request_headers


def allow_unsafe_url(http_path):
    if bool(strtobool(str(config.ALLOW_UNSAFE_URL))):
        http_path = '/unsafe' + http_path
    return http_path


def rewrite(http_path):
    if str(os.environ.get('REWRITE_ENABLED')).upper() == 'YES':
        http_path = lambda_rewrite.match_patterns(http_path)
    return http_path


def is_thumbor_down():
     if not os.path.exists(thumbor_socket):
         start_server()
     session = requests_unixsocket.Session()
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
     return False, session


def request_thumbor(original_request, session):
    http_path = original_request['path']
    http_path = rewrite(http_path);
    http_path = allow_unsafe_url(http_path)
    request_headers = {}
    vary, request_headers = auto_webp(original_request, request_headers)
    return session.get(unix_path + http_path, headers=request_headers), vary


def process_thumbor_responde(thumbor_response, vary):
     if thumbor_response.status_code != 200:
         return response_formater(status_code=thumbor_response.status_code)
     if vary:
         vary = thumbor_response.headers['vary']
     content_type = thumbor_response.headers['content-type']
     body = gen_body(content_type, thumbor_response.content)
     if body is None:
         return response_formater(status_code='500',
                                  cache_control='no-cache,no-store')
     return response_formater(status_code='200',
                              body=body,
                              cache_control=thumbor_response.headers['Cache-Control'],
                              content_type=content_type,
                              expires=thumbor_response.headers['Expires'],
                              etag=thumbor_response.headers['Etag'],
                              date=thumbor_response.headers['Date'],
                              vary=vary
                              )


def call_thumbor(original_request):
    thumbor_down, session = is_thumbor_down()
    if thumbor_down:
        return thumbor_down
    thumbor_response, vary = request_thumbor(original_request, session)
    return process_thumbor_responde(thumbor_response, vary)


def gen_body(ctype, content):
    '''Convert image to base64 to be sent as body response. '''
    try:
        format_ = ctype[ctype.find('/')+1:]
        supported = ['jpeg', 'png', 'gif']
        if format_ not in supported:
            None
        return base64.b64encode(content)
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
