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

const ThumborMapping = require('../thumbor-mapping');
let assert = require('assert');

// ----------------------------------------------------------------------------
// process()
// ----------------------------------------------------------------------------
describe('process()', function() {
    describe('001/thumborRequest', function() {
        it(`Should pass if the proper edit translations are applied and in the 
            correct order`, function() {
            // Arrange
            const event = {
                path : "/fit-in/200x300/filters:grayscale()/test-image-001.jpg"
            }
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: {
                        width: 200,
                        height: 300
                    },
                    grayscale: true
                }
            };
            assert.deepEqual(thumborMapping.edits, expectedResult.edits);
        });
    });
});

// ----------------------------------------------------------------------------
// parseCustomPath()
// ----------------------------------------------------------------------------
describe('parseCustomPath()', function() {
    describe('001/validPath', function() {
        it(`Should pass if the proper edit translations are applied and in the 
            correct order`, function() {
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg'
            }
            process.env.REWRITE_MATCH_PATTERN = /(filters-)/gm;
            process.env.REWRITE_SUBSTITUTION = 'filters:';
            // Act
            const thumborMapping = new ThumborMapping();
            const result = thumborMapping.parseCustomPath(event.path);
            // Assert
            const expectedResult = '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg';
            assert.deepEqual(result.path, expectedResult);
        });
    });
    describe('002/undefinedEnvironmentVariables', function() {
        it(`Should throw an error if the environment variables are left undefined`, function() {
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg'
            }
            process.env.REWRITE_MATCH_PATTERN = undefined;
            process.env.REWRITE_SUBSTITUTION = undefined;
            // Act
            const thumborMapping = new ThumborMapping();
            // Assert
            assert.throws(function() {
                thumborMapping.parseCustomPath(event.path);
            }, Error, 'ThumborMapping::ParseCustomPath::ParsingError');
        });
    });
    describe('003/undefinedPath', function() {
        it(`Should throw an error if the path is not defined`, function() {
            const event = {};
            process.env.REWRITE_MATCH_PATTERN = /(filters-)/gm;
            process.env.REWRITE_SUBSTITUTION = 'filters:';
            // Act
            const thumborMapping = new ThumborMapping();
            // Assert
            assert.throws(function() {
                thumborMapping.parseCustomPath(event.path);
            }, Error, 'ThumborMapping::ParseCustomPath::ParsingError');
        });
    });
    describe('004/undefinedAll', function() {
        it(`Should throw an error if the path is not defined`, function() {
            const event = {};
            process.env.REWRITE_MATCH_PATTERN = undefined;
            process.env.REWRITE_SUBSTITUTION = undefined;
            // Act
            const thumborMapping = new ThumborMapping();
            // Assert
            assert.throws(function() {
                thumborMapping.parseCustomPath(event.path);
            }, Error, 'ThumborMapping::ParseCustomPath::ParsingError');
        });
    });
});

// ----------------------------------------------------------------------------
// mapFilter()
// ----------------------------------------------------------------------------
describe('mapFilter()', function() {
    describe('001/autojpg', function() {
        it(`Should pass if the filter is successfully converted from 
            Thumbor:autojpg()`, function() {
            // Arrange
            const edit = 'filters:autojpg()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { toFormat: 'jpg' }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('002/background_color', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:background_color()`, function() {
            // Arrange
            const edit = 'filters:background_color(#ffff)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { flatten: { background: '#ffff' }}
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('003/blur/singleParameter', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:blur()`, function() {
            // Arrange
            const edit = 'filters:blur(60)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { blur: 30 }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('004/blur/doubleParameter', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:blur()`, function() {
            // Arrange
            const edit = 'filters:blur(60, 2)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { blur: 2 }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('005/convolution', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:convolution()`, function() {
            // Arrange
            const edit = 'filters:convolution(1;2;1;2;4;2;1;2;1,3,true)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { convolve: {
                    width: 3,
                    height: 3, 
                    kernel: [1,2,1,2,4,2,1,2,1]
                }}
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('006/equalize', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:equalize()`, function() {
            // Arrange
            const edit = 'filters:equalize()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { normalize: 'true' }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('007/fill/resizeUndefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:fill()`, function() {
            // Arrange
            const edit = 'filters:fill(#fff)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { resize: { background: '#fff' }}
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });

    describe('008/fill/resizeDefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:fill()`, function() {
            // Arrange
            const edit = 'filters:fill(#fff)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { resize: { background: '#fff' }}
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('009/format/supportedFileType', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:format()`, function() {
            // Arrange
            const edit = 'filters:format(png)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { toFormat: 'png' }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('010/format/unsupportedFileType', function() {
        it(`Should return undefined if an accepted file format is not specified`
            , function() {
            // Arrange
            const edit = 'filters:format(test)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('011/no_upscale/resizeUndefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:no_upscale()`, function() {
            // Arrange
            const edit = 'filters:no_upscale()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: {
                        fit: 'inside',
                        height: undefined,
                        width: undefined
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('012/no_upscale/resizeDefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:no_upscale()`, function() {
            // Arrange
            const edit = 'filters:no_upscale()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: {
                        fit: 'inside',
                        height: undefined,
                        width: undefined
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('013/proportion/resizeDefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:proportion()`, function() {
            // Arrange
            const edit = 'filters:proportion(0.3)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits = {
                resize: {
                    width: 200,
                    height: 200
                }
            };
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: {
                        height: 60,
                        width: 60
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('014/proportion/resizeUndefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:resize()`, function() {
            // Arrange
            const edit = 'filters:proportion(0.3)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const actualResult = (typeof(thumborMapping.edits.resize) !== undefined);
            const expectedResult = true;
            assert.deepEqual(actualResult, expectedResult);
        });
    });
    describe('015/quality/jpg', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:quality()`, function() {
            // Arrange
            const edit = 'filters:quality(50)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    jpeg: {
                        quality: 50
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('016/quality/png', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:quality()`, function() {
            // Arrange
            const edit = 'filters:quality(50)';
            const filetype = 'png';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    png: {
                        quality: 50
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('017/quality/webp', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:quality()`, function() {
            // Arrange
            const edit = 'filters:quality(50)';
            const filetype = 'webp';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    webp: {
                        quality: 50
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('018/quality/tiff', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:quality()`, function() {
            // Arrange
            const edit = 'filters:quality(50)';
            const filetype = 'tiff';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    tiff: {
                        quality: 50
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('019/quality/other', function() {
        it(`Should return undefined if an unsupported file type is provided`,
            function() {
            // Arrange
            const edit = 'filters:quality(50)';
            const filetype = 'xml';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('020/rgb', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:rgb()`, function() {
            // Arrange
            const edit = 'filters:rgb(10, 10, 10)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    tint: {
                        r: 25.5,
                        g: 25.5,
                        b: 25.5
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('021/rotate', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:rotate()`, function() {
            // Arrange
            const edit = 'filters:rotate(75)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    rotate: 75
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('022/sharpen', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:sharpen()`, function() {
            // Arrange
            const edit = 'filters:sharpen(75, 5)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    sharpen: 3.5
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('023/stretch/default', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:stretch()`, function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: { fit: 'fill' }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('024/stretch/resizeDefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:stretch()`, function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: { fit: 'fill' }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('025/stretch/sizingMethodUndefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:stretch()`, function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.sizingMethod = undefined;
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: { fit: 'fill' }
                },
                sizingMethod: undefined
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('026/stretch/sizingMethodNotFitIn', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:stretch()`, function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.sizingMethod = "cover";
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: { fit: 'fill' }
                },
                sizingMethod: "cover"
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('027/stretch/sizingMethodFitIn', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:stretch()`, function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.sizingMethod = "fit-in";
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: {}
                },
                sizingMethod: "fit-in"
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('028/strip_exif', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:strip_exif()`, function() {
            // Arrange
            const edit = 'filters:strip_exif()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    rotate: 0
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('029/strip_icc', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:strip_icc()`, function() {
            // Arrange
            const edit = 'filters:strip_icc()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    rotate: 0
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('030/upscale', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:upscale()`, function() {
            // Arrange
            const edit = 'filters:upscale()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: {
                        fit: 'inside'
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('031/upscale/resizeNotUndefined', function() {
        it(`Should pass if the filter is successfully translated from 
            Thumbor:upscale()`, function() {
            // Arrange
            const edit = 'filters:upscale()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { 
                    resize: {
                        fit: 'inside'
                    }
                }
            };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
    describe('032/elseCondition', function() {
        it(`Should pass if undefined is returned for an unsupported filter`, 
            function() {
            // Arrange
            const edit = 'filters:notSupportedFilter()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = { edits: {} };
            assert.deepEqual(thumborMapping, expectedResult);
        });
    });
})