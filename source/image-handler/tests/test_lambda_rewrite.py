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
import os
from image_handler.lambda_rewrite import match_patterns


class match_patterns_test_case(unittest.TestCase):
    def setUp(self):
        value = (
            r"["
            r"(r'^/([a])/([0-9a-f]+)-(zoom)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/650x650/sample/\2.\4'),"
            r"(r'^/([b])/([0-9a-f]+)-(zoom)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/650x650/raw/\2.\4'),"
            r"(r'^/([a])/([0-9a-f]+)-(raw)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/360x360/sample/\2.\4'),"
            r"(r'^/([b])/([0-9a-f]+)-(raw)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/360x360/raw/\2.\4'),"
            r"(r'^/([a])/([0-9a-f]+)-(cart)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/83x83/sample/\2.\4'),"
            r"(r'^/([b])/([0-9a-f]+)-(cart)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/83x83/raw/\2.\4'),"
            r"(r'^/([a])/([0-9a-f]+)-(catalog)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/180x180/sample/\2.\4'),"
            r"(r'^/([b])/([0-9a-f]+)-(catalog)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/180x180/raw/\2.\4'),"
            r"(r'^/([a])/([0-9a-f]+)-(gallery)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/22x22/sample/\2.\4'),"
            r"(r'^/([b])/([0-9a-f]+)-(gallery)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/22x22/raw/\2.\4'),"
            r"(r'^/([a])/([0-9a-f]+)-(list)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/63x63/sample/\2.\4'),"
            r"(r'^/([b])/([0-9a-f]+)-(list)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/63x63/raw/\2.\4'),"
            r"(r'^/([a])/([0-9a-f]+)-(related)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/47x47/sample/\2.\4'),"
            r"(r'^/([b])/([0-9a-f]+)-(related)\.([a-zA-Z0-9]+)$',"
            r"r'/fit-in/47x47/raw/\2.\4')"
            "]"
        )
        os.environ['REWRITE_PATTERNS'] = value
    def test_is_five_prime(self):
        expected = (
            r"/fit-in/650x650/raw"
            r"/4fff89be6cca5cf00afe8062a54796fa.jpg"
            )
        self.assertEqual(
            match_patterns("/b/4fff89be6cca5cf00afe8062a54796fa-zoom.jpg"),
            expected
        )

if __name__ == '__main__':
    unittest.main()
