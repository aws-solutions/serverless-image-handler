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

import unittest
import timeit
from mock import patch
from image_handler.lambda_function import start_server
from image_handler.lambda_function import send_metrics
from event import import_event
from image_handler.lambda_function import response_formater


class start_server_test_case(unittest.TestCase):

    def test_start_server(self):
        with patch('image_handler.lambda_function.start_thumbor') as mock:
            t = start_server()
            t.join()
            mock.assert_called_once_with()


class send_metrics_test_case(unittest.TestCase):

    def setUp(self):
        self.event = import_event()
        self.response = response_formater()
        self.timestamp = timeit.default_timer()

    def test_send_metrics(self):
        with patch('image_handler.lambda_metrics.send_data') as mock:
            t = send_metrics(self.event, self.response, self.timestamp)
            t.join()
            mock.assert_called_once_with(
                self.event,
                self.response,
                self.timestamp
            )

if __name__ == '__main__':
    unittest.main()
