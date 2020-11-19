// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const ThumborMapping = require('../thumbor-mapping');

// ----------------------------------------------------------------------------
// process()
// ----------------------------------------------------------------------------
describe('process()', function() {
    describe('001/thumborRequest', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
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
                        height: 300,
                        fit: 'inside'
                    },
                    grayscale: true
                }
            };
            expect(thumborMapping.edits).toEqual(expectedResult.edits);
        });
    });
    describe('002/resize/fit-in', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
            // Arrange
            const event = {
                path : "/fit-in/400x300/test-image-001.jpg"
            }
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        width: 400,
                        height: 300,
                        fit: 'inside'
                    }
                }
            };
            expect(thumborMapping.edits).toEqual(expectedResult.edits);
        });
    });
    describe('003/resize/fit-in/noResizeValues', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
            // Arrange
            const event = {
                path : "/fit-in/test-image-001.jpg"
            }
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            // Assert
            const expectedResult = {
                edits: {
                    resize: { fit: 'inside' }
                }
            };
            expect(thumborMapping.edits).toEqual(expectedResult.edits);
        });
    });
    describe('004/resize/not-fit-in', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
            // Arrange
            const event = {
                path : "/400x300/test-image-001.jpg"
            }
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        width: 400,
                        height: 300
                    }
                }
            };
            expect(thumborMapping.edits).toEqual(expectedResult.edits);
        });
    });
    describe('005/resize/widthIsZero', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
            // Arrange
            const event = {
                path : "/0x300/test-image-001.jpg"
            }
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        width: null,
                        height: 300,
                        fit: 'inside'
                    }
                }
            };
            expect(thumborMapping.edits).toEqual(expectedResult.edits);
        });
    });
    describe('006/resize/heightIsZero', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
            // Arrange
            const event = {
                path : "/400x0/test-image-001.jpg"
            }
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        width: 400,
                        height: null,
                        fit: 'inside'
                    }
                }
            };
            expect(thumborMapping.edits).toEqual(expectedResult.edits);
        });
    });
    describe('007/resize/widthAndHeightAreZero', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
            // Arrange
            const event = {
                path : "/0x0/test-image-001.jpg"
            }
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.process(event);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        width: null,
                        height: null,
                        fit: 'inside'
                    }
                }
            };
            expect(thumborMapping.edits).toEqual(expectedResult.edits);
        });
    });
});

// ----------------------------------------------------------------------------
// parseCustomPath()
// ----------------------------------------------------------------------------
describe('parseCustomPath()', function() {
    describe('001/validPath', function() {
        it('Should pass if the proper edit translations are applied and in the correct order', function() {
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
            expect(result.path).toEqual(expectedResult);
        });
    });
    describe('002/undefinedEnvironmentVariables', function() {
        it('Should throw an error if the environment variables are left undefined', function() {
            const event = {
                path : '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg'
            }
            delete process.env.REWRITE_MATCH_PATTERN;
            delete process.env.REWRITE_SUBSTITUTION;
            // Act
            const thumborMapping = new ThumborMapping();
            // Assert
            expect(() => {
                thumborMapping.parseCustomPath(event.path);
            }).toThrowError(new Error('ThumborMapping::ParseCustomPath::ParsingError'));
        });
    });
    describe('003/undefinedPath', function() {
        it('Should throw an error if the path is not defined', function() {
            const event = {};
            process.env.REWRITE_MATCH_PATTERN = /(filters-)/gm;
            process.env.REWRITE_SUBSTITUTION = 'filters:';
            // Act
            const thumborMapping = new ThumborMapping();
            // Assert
            expect(() => {
                thumborMapping.parseCustomPath(event.path);
            }).toThrowError(new Error('ThumborMapping::ParseCustomPath::ParsingError'));
        });
    });
    describe('004/undefinedAll', function() {
        it('Should throw an error if the path is not defined', function() {
            const event = {};
            delete process.env.REWRITE_MATCH_PATTERN;
            delete process.env.REWRITE_SUBSTITUTION;
            // Act
            const thumborMapping = new ThumborMapping();
            // Assert
            expect(() => {
                thumborMapping.parseCustomPath(event.path);
            }).toThrowError(new Error('ThumborMapping::ParseCustomPath::ParsingError'));
        });
    });
});

// ----------------------------------------------------------------------------
// mapFilter()
// ----------------------------------------------------------------------------
describe('mapFilter()', function() {
    describe('001/autojpg', function() {
        it('Should pass if the filter is successfully converted from Thumbor:autojpg()', function() {
            // Arrange
            const edit = 'filters:autojpg()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { toFormat: 'jpeg' }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('002/background_color', function() {
        it('Should pass if the filter is successfully translated from Thumbor:background_color()', function() {
            // Arrange
            const edit = 'filters:background_color(ffff)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { flatten: { background: {r: 255, g: 255, b: 255}}}
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('003/blur/singleParameter', function() {
        it('Should pass if the filter is successfully translated from Thumbor:blur()', function() {
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
            // assert.deepStrictEqual(thumborMapping, expectedResult);
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('004/blur/doubleParameter', function() {
        it('Should pass if the filter is successfully translated from Thumbor:blur()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('005/convolution', function() {
        it('Should pass if the filter is successfully translated from Thumbor:convolution()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('006/equalize', function() {
        it('Should pass if the filter is successfully translated from Thumbor:equalize()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('007/fill/resizeUndefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:fill()', function() {
            // Arrange
            const edit = 'filters:fill(fff)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { resize: { background: { r: 255, g: 255, b: 255 }, fit: 'contain' }}
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });

    describe('008/fill/resizeDefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:fill()', function() {
            // Arrange
            const edit = 'filters:fill(fff)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {};
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: { resize: { background: { r: 255, g: 255, b: 255 }, fit: 'contain' }}
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('009/format/supportedFileType', function() {
        it('Should pass if the filter is successfully translated from Thumbor:format()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('010/format/unsupportedFileType', function() {
        it('Should return undefined if an accepted file format is not specified', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('011/no_upscale/resizeUndefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:no_upscale()', function() {
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
                        withoutEnlargement: true
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('012/no_upscale/resizeDefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:no_upscale()', function() {
            // Arrange
            const edit = 'filters:no_upscale()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {
                height: 400,
                width: 300
            };
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        height: 400,
                        width: 300,
                        withoutEnlargement: true
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('013/proportion/resizeDefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:proportion()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('014/proportion/resizeUndefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:resize()', function() {
            // Arrange
            const edit = 'filters:proportion(0.3)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const actualResult = thumborMapping.edits.resize !== undefined;
            const expectedResult = true;
            expect(actualResult).toEqual(expectedResult);
        });
    });
    describe('015/quality/jpg', function() {
        it('Should pass if the filter is successfully translated from Thumbor:quality()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('016/quality/png', function() {
        it('Should pass if the filter is successfully translated from Thumbor:quality()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('017/quality/webp', function() {
        it('Should pass if the filter is successfully translated from Thumbor:quality()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('018/quality/tiff', function() {
        it('Should pass if the filter is successfully translated from Thumbor:quality()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('019/quality/heif', function() {
        it('Should pass if the filter is successfully translated from Thumbor:quality()', function() {
            // Arrange
            const edit = 'filters:quality(50)';
            const filetype = 'heif';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    heif: {
                        quality: 50
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('020/quality/other', function() {
        it('Should return undefined if an unsupported file type is provided', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('021/rgb', function() {
        it('Should pass if the filter is successfully translated from Thumbor:rgb()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('022/rotate', function() {
        it('Should pass if the filter is successfully translated from Thumbor:rotate()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('023/sharpen', function() {
        it('Should pass if the filter is successfully translated from Thumbor:sharpen()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('024/stretch/default', function() {
        it('Should pass if the filter is successfully translated from Thumbor:stretch()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('025/stretch/resizeDefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:stretch()', function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {
                width: 300,
                height: 400
            };
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        width: 300,
                        height: 400,
                        fit: 'fill'
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('026/stretch/fit-in', function() {
        it('Should pass if the filter is successfully translated from Thumbor:stretch()', function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {
                fit: 'inside'
            };
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    resize: { fit: 'inside' }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('027/stretch/fit-in/resizeDefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:stretch()', function() {
            // Arrange
            const edit = 'filters:stretch()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.edits.resize = {
                width: 400,
                height: 300,
                fit: 'inside'
            };
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    resize: {
                        width: 400,
                        height: 300,
                        fit: 'inside'
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('028/strip_exif', function() {
        it('Should pass if the filter is successfully translated from Thumbor:strip_exif()', function() {
            // Arrange
            const edit = 'filters:strip_exif()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    rotate: null
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('029/strip_icc', function() {
        it('Should pass if the filter is successfully translated from Thumbor:strip_icc()', function() {
            // Arrange
            const edit = 'filters:strip_icc()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    rotate: null
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('030/upscale', function() {
        it('Should pass if the filter is successfully translated from Thumbor:upscale()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('031/upscale/resizeNotUndefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:upscale()', function() {
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
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('032/watermark/positionDefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:watermark()', function() {
            // Arrange
            const edit = 'filters:watermark(bucket,key,100,100,0)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    overlayWith: {
                        bucket: 'bucket',
                        key: 'key',
                        alpha: '0',
                        wRatio: undefined,
                        hRatio: undefined,
                        options: {
                            left: '100',
                            top: '100'
                        }
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('033/watermark/positionDefinedByPercentile', function() {
        it('Should pass if the filter is successfully translated from Thumbor:watermark()', function() {
            // Arrange
            const edit = 'filters:watermark(bucket,key,50p,30p,0)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    overlayWith: {
                        bucket: 'bucket',
                        key: 'key',
                        alpha: '0',
                        wRatio: undefined,
                        hRatio: undefined,
                        options: {
                            left: '50p',
                            top: '30p'
                        }
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('034/watermark/positionDefinedWrong', function() {
        it('Should pass if the filter is successfully translated from Thumbor:watermark()', function() {
            // Arrange
            const edit = 'filters:watermark(bucket,key,x,x,0)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    overlayWith: {
                        bucket: 'bucket',
                        key: 'key',
                        alpha: '0',
                        wRatio: undefined,
                        hRatio: undefined,
                        options: {}
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('035/watermark/ratioDefined', function() {
        it('Should pass if the filter is successfully translated from Thumbor:watermark()', function() {
            // Arrange
            const edit = 'filters:watermark(bucket,key,100,100,0,10,10)';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = {
                edits: {
                    overlayWith: {
                        bucket: 'bucket',
                        key: 'key',
                        alpha: '0',
                        wRatio: '10',
                        hRatio: '10',
                        options: {
                            left: '100',
                            top: '100'
                        }
                    }
                }
            };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
    describe('036/elseCondition', function() {
        it('Should pass if undefined is returned for an unsupported filter', function() {
            // Arrange
            const edit = 'filters:notSupportedFilter()';
            const filetype = 'jpg';
            // Act
            const thumborMapping = new ThumborMapping();
            thumborMapping.mapFilter(edit, filetype);
            // Assert
            const expectedResult = { edits: {} };
            expect(thumborMapping).toEqual(expectedResult);
        });
    });
})