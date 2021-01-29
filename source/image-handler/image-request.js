// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const ThumborMapping = require('./thumbor-mapping');

class ImageRequest {
    constructor(s3, secretsManager) {
        this.s3 = s3;
        this.secretsManager = secretsManager;
    }

    /**
     * Initializer function for creating a new image request, used by the image
     * handler to perform image modifications.
     * @param {object} event - Lambda request body.
     */
    async setup(event) {
        try {
            // Checks signature enabled
            if (process.env.ENABLE_SIGNATURE === 'Yes') {
                const crypto = require('crypto');
                const { path, queryStringParameters } = event;
                if (!queryStringParameters || !queryStringParameters.signature) {
                    throw {
                        status: 400,
                        message: 'Query-string requires the signature parameter.',
                        code: 'AuthorizationQueryParametersError'
                    };
                }

                const { signature } = queryStringParameters;
                try {
                    const response = await this.secretsManager.getSecretValue({ SecretId: process.env.SECRETS_MANAGER }).promise();
                    const secretString = JSON.parse(response.SecretString);
                    const hash = crypto.createHmac('sha256', secretString[process.env.SECRET_KEY]).update(path).digest('hex');

                    // Signature should be made with the full path.
                    if (signature !== hash) {
                        throw {
                            status: 403,
                            message: 'Signature does not match.',
                            code: 'SignatureDoesNotMatch'
                        };
                    }
                } catch (error) {
                    if (error.code === 'SignatureDoesNotMatch') {
                        throw error;
                    }

                    console.error('Error occurred while checking signature.', error);
                    throw {
                        status: 500,
                        message: 'Signature validation failed.',
                        code: 'SignatureValidationFailure'
                    };
                }
            }

            this.requestType = this.parseRequestType(event);
            this.bucket = this.parseImageBucket(event, this.requestType);
            this.key = this.parseImageKey(event, this.requestType);
            this.edits = this.parseImageEdits(event, this.requestType);
            this.originalImage = await this.getOriginalImage(this.bucket, this.key);
            this.headers = this.parseImageHeaders(event, this.requestType);

            if (!this.headers) {
                delete this.headers;
            }

            // If the original image is SVG file and it has any edits but no output format, change the format to WebP.
            if (this.ContentType === 'image/svg+xml'
                && this.edits && Object.keys(this.edits).length > 0
                && !this.edits.toFormat) {
                this.outputFormat = 'png'
            }

            /* Decide the output format of the image.
             * 1) If the format is provided, the output format is the provided format.
             * 2) If headers contain "Accept: image/webp", the output format is webp.
             * 3) Use the default image format for the rest of cases.
             */
            if (this.ContentType !== 'image/svg+xml' || this.edits.toFormat || this.outputFormat) {
                let outputFormat = this.getOutputFormat(event);
                if (this.edits && this.edits.toFormat) {
                    this.outputFormat = this.edits.toFormat;
                } else if (outputFormat) {
                    this.outputFormat = outputFormat;
                }
            }
            
            // Fix quality for Thumbor and Custom request type if outputFormat is different from quality type.
            if (this.outputFormat) {
                const requestType = ['Custom', 'Thumbor'];
                const acceptedValues = ['jpeg', 'png', 'webp', 'tiff', 'heif'];

                this.ContentType = `image/${this.outputFormat}`;
                if (requestType.includes(this.requestType) && acceptedValues.includes(this.outputFormat)) {
                    let qualityKey = Object.keys(this.edits).filter(key => acceptedValues.includes(key))[0];
                    if (qualityKey && (qualityKey !== this.outputFormat)) {
                        const qualityValue = this.edits[qualityKey];
                        this.edits[this.outputFormat] = qualityValue;
                        delete this.edits[qualityKey];
                    }
                }
            }

            delete this.s3;
            delete this.secretsManager;

            return this;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    /**
     * Gets the original image from an Amazon S3 bucket.
     * @param {string} bucket - The name of the bucket containing the image.
     * @param {string} key - The key name corresponding to the image.
     * @return {Promise} - The original image or an error.
     */
    async getOriginalImage(bucket, key) {
        const imageLocation = { Bucket: bucket, Key: key };
        try {
            const originalImage = await this.s3.getObject(imageLocation).promise();

            if (originalImage.ContentType) {
                //If using default s3 ContentType infer from hex headers
                if(originalImage.ContentType === 'binary/octet-stream') {
                    const imageBuffer = Buffer.from(originalImage.Body);
                    this.ContentType = this.inferImageType(imageBuffer);
                } else {
                    this.ContentType = originalImage.ContentType;
                }
            } else {
                this.ContentType = "image";
            }

            if (originalImage.Expires) {
                this.Expires = new Date(originalImage.Expires).toUTCString();
            }

            if (originalImage.LastModified) {
                this.LastModified = new Date(originalImage.LastModified).toUTCString();
            }

            if (originalImage.CacheControl) {
                this.CacheControl = originalImage.CacheControl;
            } else {
                this.CacheControl = "max-age=31536000,public";
            }
            return originalImage.Body;
        } catch(err) {
            throw {
                status: ('NoSuchKey' === err.code) ? 404 : 500,
                code: err.code,
                message: err.message
            };
        }
    }

    /**
     * Parses the name of the appropriate Amazon S3 bucket to source the
     * original image from.
     * @param {string} event - Lambda request body.
     * @param {string} requestType - Image handler request type.
     */
    parseImageBucket(event, requestType) {
        if (requestType === "Default") {
            // Decode the image request
            const decoded = this.decodeRequest(event);
            if (decoded.bucket !== undefined) {
                // Check the provided bucket against the allowed list
                const sourceBuckets = this.getAllowedSourceBuckets();
                if (sourceBuckets.includes(decoded.bucket) || decoded.bucket.match(new RegExp('^' + sourceBuckets[0] + '$'))) {
                    return decoded.bucket;
                } else {
                    throw ({
                        status: 403,
                        code: 'ImageBucket::CannotAccessBucket',
                        message: 'The bucket you specified could not be accessed. Please check that the bucket is specified in your SOURCE_BUCKETS.'
                    });
                }
            } else {
                // Try to use the default image source bucket env var
                const sourceBuckets = this.getAllowedSourceBuckets();
                return sourceBuckets[0];
            }
        } else if (requestType === "Thumbor" || requestType === "Custom") {
            // Use the default image source bucket env var
            const sourceBuckets = this.getAllowedSourceBuckets();
            return sourceBuckets[0];
        } else {
            throw ({
                status: 404,
                code: 'ImageBucket::CannotFindBucket',
                message: 'The bucket you specified could not be found. Please check the spelling of the bucket name in your request.'
            });
        }
    }

    /**
     * Parses the edits to be made to the original image.
     * @param {string} event - Lambda request body.
     * @param {string} requestType - Image handler request type.
     */
    parseImageEdits(event, requestType) {
        if (requestType === "Default") {
            const decoded = this.decodeRequest(event);
            return decoded.edits;
        } else if (requestType === "Thumbor") {
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            return thumborMapping.edits;
        } else if (requestType === "Custom") {
            const thumborMapping = new ThumborMapping();
            const parsedPath = thumborMapping.parseCustomPath(event.path);
            thumborMapping.process(parsedPath);
            return thumborMapping.edits;
        } else {
            throw ({
                status: 400,
                code: 'ImageEdits::CannotParseEdits',
                message: 'The edits you provided could not be parsed. Please check the syntax of your request and refer to the documentation for additional guidance.'
            });
        }
    }

    /**
     * Parses the name of the appropriate Amazon S3 key corresponding to the
     * original image.
     * @param {String} event - Lambda request body.
     * @param {String} requestType - Type, either "Default", "Thumbor", or "Custom".
     */
    parseImageKey(event, requestType) {
        if (requestType === "Default") {
            // Decode the image request and return the image key
            const decoded = this.decodeRequest(event);
            return decoded.key;
        }

        if (requestType === "Thumbor" || requestType === "Custom") {
            let { path } = event;

            if (requestType === "Custom") {
                const matchPattern = process.env.REWRITE_MATCH_PATTERN;
                const substitution = process.env.REWRITE_SUBSTITUTION;

                if (typeof(matchPattern) === 'string') {
                    const patternStrings = matchPattern.split('/');
                    const flags = patternStrings.pop();
                    const parsedPatternString = matchPattern.slice(1, matchPattern.length - 1 - flags.length);
                    const regExp = new RegExp(parsedPatternString, flags);
                    path = path.replace(regExp, substitution);
                } else {
                    path = path.replace(matchPattern, substitution);
                }
            }
            return decodeURIComponent(path.replace(/\/(\d+x\d+)\/|filters:[^\)]+|\/fit-in+|^\/+/g, '').replace(/\)/g, '').replace(/^\/+/, ''));
        }

        // Return an error for all other conditions
        throw ({
            status: 404,
            code: 'ImageEdits::CannotFindImage',
            message: 'The image you specified could not be found. Please check your request syntax as well as the bucket you specified to ensure it exists.'
        });
    }

    /**
     * Determines how to handle the request being made based on the URL path
     * prefix to the image request. Categorizes a request as either "image"
     * (uses the Sharp library), "thumbor" (uses Thumbor mapping), or "custom"
     * (uses the rewrite function).
     * @param {object} event - Lambda request body.
    */
    parseRequestType(event) {
        const path = event["path"];
        const matchDefault = new RegExp(/^(\/?)([0-9a-zA-Z+\/]{4})*(([0-9a-zA-Z+\/]{2}==)|([0-9a-zA-Z+\/]{3}=))?$/);
        const matchThumbor = new RegExp(/^(\/?)((fit-in)?|(filters:.+\(.?\))?|(unsafe)?)(((.(?!(\.[^.\\\/]+$)))*$)|.*(\.jpg$|.\.png$|\.webp$|\.tiff$|\.jpeg$|\.svg$))/i);
        const matchCustom = new RegExp(/(\/?)(.*)(jpg|png|webp|tiff|jpeg|svg)/i);
        const definedEnvironmentVariables = (
            (process.env.REWRITE_MATCH_PATTERN !== "") &&
            (process.env.REWRITE_SUBSTITUTION !== "") &&
            (process.env.REWRITE_MATCH_PATTERN !== undefined) &&
            (process.env.REWRITE_SUBSTITUTION !== undefined)
        );

        //Check if path is base 64 encoded
        let isBase64Encoded = true;
        try {
            this.decodeRequest(event);
        } catch(error) {
            console.error(error);
            isBase64Encoded = false;
        } 

        if (matchDefault.test(path) && isBase64Encoded) {  // use sharp
            return 'Default';
        } else if (matchCustom.test(path) && definedEnvironmentVariables) {  // use rewrite function then thumbor mappings
            return 'Custom';
        } else if (matchThumbor.test(path)) {  // use thumbor mappings
            return 'Thumbor';
        } else {
            throw {
                status: 400,
                code: 'RequestTypeError',
                message: 'The type of request you are making could not be processed. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg) and that your image request is provided in the correct syntax. Refer to the documentation for additional guidance on forming image requests.'
            };
        }
    }

    /**
     * Parses the headers to be sent with the response.
     * @param {object} event - Lambda request body.
     * @param {string} requestType - Image handler request type.
     * @return {object} Custom headers
     */
    parseImageHeaders(event, requestType) {
        if (requestType === 'Default') {
            const decoded = this.decodeRequest(event);
            if (decoded.headers) {
                return decoded.headers;
            }
        }

        return undefined;
    }

    /**
     * Decodes the base64-encoded image request path associated with default
     * image requests. Provides error handling for invalid or undefined path values.
     * @param {object} event - The proxied request object.
     */
    decodeRequest(event) {
        const path = event["path"];
        if (path !== undefined) {
            const encoded = path.charAt(0) === '/' ? path.slice(1) : path;
            const toBuffer = Buffer.from(encoded, 'base64');
            try {
                // To support European characters, 'ascii' was removed.
                return JSON.parse(toBuffer.toString());
            } catch (e) {
                throw ({
                    status: 400,
                    code: 'DecodeRequest::CannotDecodeRequest',
                    message: 'The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.'
                });
            }
        } else {
            throw ({
                status: 400,
                code: 'DecodeRequest::CannotReadPath',
                message: 'The URL path you provided could not be read. Please ensure that it is properly formed according to the solution documentation.'
            });
        }
    }

    /**
     * Returns a formatted image source bucket whitelist as specified in the
     * SOURCE_BUCKETS environment variable of the image handler Lambda
     * function. Provides error handling for missing/invalid values.
     */
    getAllowedSourceBuckets() {
        const sourceBuckets = process.env.SOURCE_BUCKETS;
        if (sourceBuckets === undefined) {
            throw ({
                status: 400,
                code: 'GetAllowedSourceBuckets::NoSourceBuckets',
                message: 'The SOURCE_BUCKETS variable could not be read. Please check that it is not empty and contains at least one source bucket, or multiple buckets separated by commas. Spaces can be provided between commas and bucket names, these will be automatically parsed out when decoding.'
            });
        } else {
            const formatted = sourceBuckets.replace(/\s+/g, '');
            const buckets = formatted.split(',');
            return buckets;
        }
    }

    /**
    * Return the output format depending on the accepts headers and request type
    * @param {Object} event - The request body.
    */
    getOutputFormat(event) {
        const autoWebP = process.env.AUTO_WEBP;
        if (autoWebP === 'Yes' && event.headers.Accept && event.headers.Accept.includes('image/webp')) {
            return 'webp';
        } else if (this.requestType === 'Default') {
            const decoded = this.decodeRequest(event);
            return decoded.outputFormat;
        }

        return null;
    }

    /**
    * Return the output format depending on first four hex values of an image file.
    * @param {Buffer} imageBuffer - Image buffer.
    */
   inferImageType(imageBuffer) {
    switch(imageBuffer.toString('hex').substring(0,8).toUpperCase()) {
        case '89504E47': return 'image/png';
        case 'FFD8FFDB': return 'image/jpeg';
        case 'FFD8FFE0': return 'image/jpeg';
        case 'FFD8FFEE': return 'image/jpeg';
        case 'FFD8FFE1': return 'image/jpeg';
        case '52494646': return 'image/webp';
        case '49492A00': return 'image/tiff';
        case '4D4D002A': return 'image/tiff';
        default: throw {
            status: 500,
            code: 'RequestTypeError',
            message: 'The file does not have an extension and the file type could not be inferred. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg). Refer to the documentation for additional guidance on forming image requests.'
        };   
    }
}
}

// Exports
module.exports = ImageRequest;