/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';
let https = require('https');

// Metrics class for sending usage metrics to sb endpoints
class Metrics {

    constructor() {
        this.endpoint = 'metrics.awssolutionsbuilder.com';
    }

    sendAnonymousMetric(metric) {

        return new Promise((resolve, reject) => {

            let _options = {
                hostname: this.endpoint,
                port: 443,
                path: '/generic',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            let request = https.request(_options, function(response) {
                // data is streamed in chunks from the server
                // so we have to handle the "data" event
                let buffer;
                let data;
                let route;

                response.on('data', function(chunk) {
                    buffer += chunk;
                });

                response.on('end', function(err) {
                    resolve('metric sent');
                });
            });

            if (metric) {
                request.write(JSON.stringify(metric));
            }

            request.end();

            request.on('error', (e) => {
                console.error(e);
                reject(['Error occurred when sending metric request.', JSON.stringify(_payload)].join(' '));
            });
        });

    }

}

module.exports = Metrics;