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
 
const AWS = require('aws-sdk');  
const sharp = require('sharp');  
  
class ImageHandler {  
  
    /**  
     * Main method for processing image requests and outputting modified images.  
     * @param {ImageRequest} request - An ImageRequest object.  
     */  
    async process(request) {  
        const originalImage = request.originalImage; 
        const edits = request.edits; 
        if (edits !== undefined) { 
            const modifiedImage = await this.applyEdits(originalImage, edits); 
            if (request.outputFormat !== undefined) {  
                await modifiedImage.toFormat(request.outputFormat);  
            }  
            const bufferImage = await modifiedImage.toBuffer();  
            return bufferImage.toString('base64'); 
        } else { 
            return originalImage.toString('base64'); 
        } 
    }  
  
    /**  
     * Applies image modifications to the original image based on edits  
     * specified in the ImageRequest.  
     * @param {Buffer} originalImage - The original image.  
     * @param {Object} edits - The edits to be made to the original image.  
     */  
    async applyEdits(originalImage, edits) {  
        const image = sharp(originalImage);  
        const keys = Object.keys(edits);  
        const values = Object.values(edits);  
        // Apply the image edits  
        for (let i = 0; i < keys.length; i++) {  
            const key = keys[i];  
            const value = values[i];  
            if (key === 'overlayWith') {  
                const overlay = await this.getOverlayImage(value.bucket, value.key);  
                image.overlayWith(overlay, value.options);  
            } else if (key === 'smartCrop') { 
                const options = value;
                const imageBuffer = await image.toBuffer();
                const metadata = await image.metadata();
                // ----
                const boundingBox = await this.getBoundingBox(imageBuffer, options.faceIndex);  
                const cropArea = await this.getCropArea(boundingBox, options, metadata);  
                try { image.extract(cropArea) } 
                catch (err) {
                    throw ({
                        status: 400,
                        code: 'SmartCrop::PaddingOutOfBounds',
                        message: 'The padding value you provided exceeds the boundaries of the original image. Please try choosing a smaller value or applying padding via Sharp for greater specificity.'
                    });
                }
            } else {  
                image[key](value);  
            }  
        }  
        // Return the modified image  
        return image;  
    }  
      
    /**  
     * Gets an image to be used as an overlay to the primary image from an  
     * Amazon S3 bucket.  
     * @param {string} bucket - The name of the bucket containing the overlay.  
     * @param {string} key - The keyname corresponding to the overlay.  
     */  
    async getOverlayImage(bucket, key) {  
        const s3 = new AWS.S3();  
        const params = { Bucket: bucket, Key: key };  
        // Request  
        const request = s3.getObject(params).promise();  
        // Response handling  
        try {  
            const overlayImage = await request;  
            return Promise.resolve(overlayImage.Body);  
        } catch (err) {  
            return Promise.reject({  
                status: 500,  
                code: err.code,  
                message: err.message  
            })  
        }  
    }  
      
    /**  
     * Calculates the crop area for a smart-cropped image based on the bounding
     * box data returned by Amazon Rekognition, as well as padding options and
     * the image metadata.
     * @param {Object} boundingBox - The boudning box of the detected face. 
     * @param {Object} options - Set of options for smart cropping.  
     * @param {Object} metadata - Sharp image metadata.
     */  
    getCropArea(boundingBox, options, metadata) {  
        const padding = (options.padding !== undefined) ? parseFloat(options.padding) : 0;
        // Calculate the smart crop area  
        const cropArea = {  
            left : parseInt((boundingBox.Left*metadata.width)-padding),  
            top : parseInt((boundingBox.Top*metadata.height)-padding),  
            width : parseInt((boundingBox.Width*metadata.width)+(padding*2)),  
            height : parseInt((boundingBox.Height*metadata.height)+(padding*2)),  
        }  
        // Return the crop area  
        return cropArea;  
    }  
  
    /**  
     * Gets the bounding box of the specified face index within an image, if specified.  
     * @param {Sharp} imageBuffer - The original image.  
     * @param {Integer} faceIndex - The zero-based face index value, moving from 0 and up as   
     * confidence decreases for detected faces within the image.  
     */  
    async getBoundingBox(imageBuffer, faceIndex) {  
        const rekognition = new AWS.Rekognition();  
        const params = { Image: { Bytes: imageBuffer }};  
        const faceIdx = (faceIndex !== undefined) ? faceIndex : 0;
        // Request  
        const request = rekognition.detectFaces(params).promise();  
        // Response handling  
        try {  
            const response = (await request).FaceDetails[faceIdx].BoundingBox;
            return Promise.resolve(await response);  
        } catch (err) {  
            console.log(err);  
            if (err.message === "Cannot read property 'BoundingBox' of undefined") {
                return Promise.reject({  
                    status: 400,
                    code: 'SmartCrop::FaceIndexOutOfRange',
                    message: 'You have provided a FaceIndex value that exceeds the length of the zero-based detectedFaces array. Please specify a value that is in-range.'
                })  
            } else {
                return Promise.reject({  
                    status: 500,  
                    code: err.code,  
                    message: err.message  
                })  
            }
        }  
    }  
}  
  
// Exports  
module.exports = ImageHandler;  

