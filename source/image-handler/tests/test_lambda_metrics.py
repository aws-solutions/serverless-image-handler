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
from urllib2 import Request
from image_handler.lambda_metrics import send_data
from image_handler.lambda_function import response_formater
from event import import_event
from mock import patch


class send_data_test_case(unittest.TestCase):

    def test_send_data(self):
        self.assertTrue(send_data(import_event(),response_formater(),timeit.default_timer()))

if __name__ == '__main__':
    unittest.main()

