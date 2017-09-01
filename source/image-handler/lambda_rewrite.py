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

import re
import logging
import os
from ast import literal_eval


def match_patterns(path):
    patterns = literal_eval(str(os.environ.get('REWRITE_PATTERNS')))
    if not patterns:
        return path
    for pattern in patterns:
        result = re.sub(pattern[0], pattern[1], path)
        logging.debug(
            "original path \"" + path +
            "\", applyed pattern \"" + pattern[0] +
            "\", result \"" + result + "\""
        )
        if result != path:
            return result
    return path
