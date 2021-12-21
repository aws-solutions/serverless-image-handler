// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageEdits, ImageFormatTypes } from '../lib';
import { ThumborMapper } from '../thumbor-mapper';

describe('process()', () => {
  describe('001/thumborRequest', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      // Arrange
      const path = '/fit-in/200x300/filters:grayscale()/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

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
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('002/resize/fit-in', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      // Arrange
      const path = '/fit-in/400x300/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

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
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('003/resize/fit-in/noResizeValues', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      // Arrange
      const path = '/fit-in/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = {
        edits: {
          resize: { fit: 'inside' }
        }
      };
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('004/resize/not-fit-in', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      // Arrange
      const path = '/400x300/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = {
        edits: {
          resize: {
            width: 400,
            height: 300
          }
        }
      };
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('005/resize/widthIsZero', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      // Arrange
      const path = '/0x300/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

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
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('006/resize/heightIsZero', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      // Arrange
      const path = '/400x0/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

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
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('007/resize/widthAndHeightAreZero', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      // Arrange
      const path = '/0x0/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

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
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('008/crop', () => {
    it('Should pass if the proper crop is applied', () => {
      // Arrange
      const path = '/10x0:100x200/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = {
        edits: {
          crop: {
            left: 10,
            top: 0,
            width: 90,
            height: 200
          }
        }
      };
      expect(edits).toEqual(expectedResult.edits);
    });

    it('Should ignore crop if invalid dimension values are provided', () => {
      // Arrange
      const path = '/abc:0:10x200/test-image-001.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = { edits: {} };
      expect(edits).toEqual(expectedResult.edits);
    });

    it('Should pass if the proper crop and resize are applied', () => {
      // Arrange
      const path = '/10x0:100x200/10x20/test-image-001.jpg';
      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = {
        edits: {
          crop: {
            left: 10,
            top: 0,
            width: 90,
            height: 200
          },
          resize: {
            width: 10,
            height: 20
          }
        }
      };
      expect(edits).toEqual(expectedResult.edits);
    });
  });

  describe('009/noFileExtension', () => {
    it('Should pass when format and quality filters are passed and file does not have extension', () => {
      // Arrange
      const path = '/filters:format(jpeg)/filters:quality(50)/image_without_extension';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = { toFormat: 'jpeg', jpeg: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });

    it('Should pass when quality and format filters are passed and file does not have extension', () => {
      // Arrange
      const path = '/filters:quality(50)/filters:format(jpeg)/image_without_extension';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = { toFormat: 'jpeg', jpeg: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });

    it('Should pass when quality and format filters are passed and file has extension', () => {
      // Arrange
      const path = '/filters:quality(50)/filters:format(jpeg)/image_without_extension.png';

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapPathToEdits(path);

      // Assert
      const expectedResult = { toFormat: 'jpeg', png: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });
  });
});

describe('parseCustomPath()', () => {
  const OLD_ENV = {
    REWRITE_MATCH_PATTERN: '/(filters-)/gm',
    REWRITE_SUBSTITUTION: 'filters:'
  };

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('001/validPath', () => {
    it('Should pass if the proper edit translations are applied and in the correct order', () => {
      const path = '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg';

      // Act
      const thumborMapper = new ThumborMapper();
      const result = thumborMapper.parseCustomPath(path);

      // Assert
      const expectedResult = '/filters:rotate(90)/filters:grayscale()/thumbor-image.jpg';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('002/undefinedPath', () => {
    it('Should throw an error if the path is not defined', () => {
      const path = undefined;
      // Act
      const thumborMapper = new ThumborMapper();

      // Assert
      expect(() => {
        thumborMapper.parseCustomPath(path);
      }).toThrowError(new Error('ThumborMapping::ParseCustomPath::PathUndefined'));
    });
  });

  describe('003/REWRITE_MATCH_PATTERN', () => {
    it('Should throw an error if the environment variables are left undefined', () => {
      const path = '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg';

      // Act
      delete process.env.REWRITE_MATCH_PATTERN;
      const thumborMapper = new ThumborMapper();

      // Assert
      expect(() => {
        thumborMapper.parseCustomPath(path);
      }).toThrowError(new Error('ThumborMapping::ParseCustomPath::RewriteMatchPatternUndefined'));
    });
  });

  describe('004/REWRITE_SUBSTITUTION', () => {
    it('Should throw an error if the path is not defined', () => {
      const path = '/filters-rotate(90)/filters-grayscale()/thumbor-image.jpg';

      // Act
      delete process.env.REWRITE_SUBSTITUTION;

      const thumborMapper = new ThumborMapper();
      // Assert
      expect(() => {
        thumborMapper.parseCustomPath(path);
      }).toThrowError(new Error('ThumborMapping::ParseCustomPath::RewriteSubstitutionUndefined'));
    });
  });
});

describe('mapFilter()', () => {
  describe('001/autojpg', () => {
    it('Should pass if the filter is successfully converted from Thumbor:autojpg()', () => {
      // Arrange
      const edit = 'filters:autojpg()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { toFormat: 'jpeg' };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('002/background_color', () => {
    it('Should pass if the filter is successfully translated from Thumbor:background_color()', () => {
      // Arrange
      const edit = 'filters:background_color(ffff)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {
        flatten: { background: { r: 255, g: 255, b: 255 } }
      };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('003/blur/singleParameter', () => {
    it('Should pass if the filter is successfully translated from Thumbor:blur()', () => {
      // Arrange
      const edit = 'filters:blur(60)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { blur: 30 };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('004/blur/doubleParameter', () => {
    it('Should pass if the filter is successfully translated from Thumbor:blur()', () => {
      // Arrange
      const edit = 'filters:blur(60, 2)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { blur: 2 };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('005/convolution', () => {
    it('Should pass if the filter is successfully translated from Thumbor:convolution()', () => {
      // Arrange
      const edit = 'filters:convolution(1;2;1;2;4;2;1;2;1,3,true)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {
        convolve: {
          width: 3,
          height: 3,
          kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1]
        }
      };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('006/equalize', () => {
    it('Should pass if the filter is successfully translated from Thumbor:equalize()', () => {
      // Arrange
      const edit = 'filters:equalize()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { normalize: true };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('007/fill/resizeUndefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:fill()', () => {
      // Arrange
      const edit = 'filters:fill(fff)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { resize: { background: { r: 255, g: 255, b: 255 }, fit: 'contain' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('008/fill/resizeDefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:fill()', () => {
      // Arrange
      const edit = 'filters:fill(fff)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      let edits: ImageEdits = { resize: {} };
      edits = thumborMapper.mapFilter(edit, filetype, edits);

      // Assert
      const expectedResult = { resize: { background: { r: 255, g: 255, b: 255 }, fit: 'contain' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('009/format/supportedFileType', () => {
    it('Should pass if the filter is successfully translated from Thumbor:format()', () => {
      // Arrange
      const edit = 'filters:format(png)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { toFormat: 'png' };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('010/format/unsupportedFileType', () => {
    it('Should return undefined if an accepted file format is not specified', () => {
      // Arrange
      const edit = 'filters:format(test)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {};
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('011/no_upscale/resizeUndefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:no_upscale()', () => {
      // Arrange
      const edit = 'filters:no_upscale()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { resize: { withoutEnlargement: true } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('012/no_upscale/resizeDefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:no_upscale()', () => {
      // Arrange
      const edit = 'filters:no_upscale()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      let edits: ImageEdits = { resize: { height: 400, width: 300 } };
      edits = thumborMapper.mapFilter(edit, filetype, edits);

      // Assert
      const expectedResult = { resize: { height: 400, width: 300, withoutEnlargement: true } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('013/proportion/resizeDefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:proportion()', () => {
      // Arrange
      const edit = 'filters:proportion(0.3)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      let edits: ImageEdits = { resize: { height: 200, width: 200 } };
      edits = thumborMapper.mapFilter(edit, filetype, edits);

      // Assert
      const expectedResult = { resize: { height: 60, width: 60 } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('014/proportion/resizeUndefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:resize()', () => {
      // Arrange
      const edit = 'filters:proportion(0.3)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      expect(edits.resize).not.toBeUndefined();
    });
  });

  describe('015/quality/jpg', () => {
    it('Should pass if the filter is successfully translated from Thumbor:quality()', () => {
      // Arrange
      const edit = 'filters:quality(50)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { jpeg: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('016/quality/png', () => {
    it('Should pass if the filter is successfully translated from Thumbor:quality()', () => {
      // Arrange
      const edit = 'filters:quality(50)';
      const filetype = ImageFormatTypes.PNG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { png: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('017/quality/webp', () => {
    it('Should pass if the filter is successfully translated from Thumbor:quality()', () => {
      // Arrange
      const edit = 'filters:quality(50)';
      const filetype = ImageFormatTypes.WEBP;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { webp: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('018/quality/tiff', () => {
    it('Should pass if the filter is successfully translated from Thumbor:quality()', () => {
      // Arrange
      const edit = 'filters:quality(50)';
      const filetype = ImageFormatTypes.TIFF;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { tiff: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('019/quality/heif', () => {
    it('Should pass if the filter is successfully translated from Thumbor:quality()', () => {
      // Arrange
      const edit = 'filters:quality(50)';
      const filetype = ImageFormatTypes.HEIF;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { heif: { quality: 50 } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('020/quality/other', () => {
    it('Should return undefined if an unsupported file type is provided', () => {
      // Arrange
      const edit = 'filters:quality(50)';
      const filetype = 'xml' as ImageFormatTypes;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {};
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('021/rgb', () => {
    it('Should pass if the filter is successfully translated from Thumbor:rgb()', () => {
      // Arrange
      const edit = 'filters:rgb(10, 10, 10)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { tint: { r: 25.5, g: 25.5, b: 25.5 } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('022/rotate', () => {
    it('Should pass if the filter is successfully translated from Thumbor:rotate()', () => {
      // Arrange
      const edit = 'filters:rotate(75)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { rotate: 75 };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('023/sharpen', () => {
    it('Should pass if the filter is successfully translated from Thumbor:sharpen()', () => {
      // Arrange
      const edit = 'filters:sharpen(75, 5)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { sharpen: 3.5 };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('024/stretch/default', () => {
    it('Should pass if the filter is successfully translated from Thumbor:stretch()', () => {
      // Arrange
      const edit = 'filters:stretch()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { resize: { fit: 'fill' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('025/stretch/resizeDefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:stretch()', () => {
      // Arrange
      const edit = 'filters:stretch()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      let edits: ImageEdits = { resize: { width: 300, height: 400 } };
      edits = thumborMapper.mapFilter(edit, filetype, edits);
      // Assert
      const expectedResult = { resize: { width: 300, height: 400, fit: 'fill' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('026/stretch/fit-in', () => {
    it('Should pass if the filter is successfully translated from Thumbor:stretch()', () => {
      // Arrange
      const edit = 'filters:stretch()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      let edits: ImageEdits = { resize: { fit: 'inside' } };
      edits = thumborMapper.mapFilter(edit, filetype, edits);

      // Assert
      const expectedResult = { resize: { fit: 'inside' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('027/stretch/fit-in/resizeDefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:stretch()', () => {
      // Arrange
      const edit = 'filters:stretch()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      let edits: ImageEdits = { resize: { width: 400, height: 300, fit: 'inside' } };
      edits = thumborMapper.mapFilter(edit, filetype, edits);

      // Assert
      const expectedResult = { resize: { width: 400, height: 300, fit: 'inside' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('028/strip_exif', () => {
    it('Should pass if the filter is successfully translated from Thumbor:strip_exif()', () => {
      // Arrange
      const edit = 'filters:strip_exif()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { rotate: null };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('029/strip_icc', () => {
    it('Should pass if the filter is successfully translated from Thumbor:strip_icc()', () => {
      // Arrange
      const edit = 'filters:strip_icc()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { rotate: null };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('030/upscale', () => {
    it('Should pass if the filter is successfully translated from Thumbor:upscale()', () => {
      // Arrange
      const edit = 'filters:upscale()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = { resize: { fit: 'inside' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('031/upscale/resizeNotUndefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:upscale()', () => {
      // Arrange
      const edit = 'filters:upscale()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      let edits: ImageEdits = { resize: {} };
      edits = thumborMapper.mapFilter(edit, filetype, edits);

      // Assert
      const expectedResult = { resize: { fit: 'inside' } };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('032/watermark/positionDefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:watermark()', () => {
      // Arrange
      const edit = 'filters:watermark(bucket,key,100,100,0)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {
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
      };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('033/watermark/positionDefinedByPercentile', () => {
    it('Should pass if the filter is successfully translated from Thumbor:watermark()', () => {
      // Arrange
      const edit = 'filters:watermark(bucket,key,50p,30p,0)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {
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
      };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('034/watermark/positionDefinedWrong', () => {
    it('Should pass if the filter is successfully translated from Thumbor:watermark()', () => {
      // Arrange
      const edit = 'filters:watermark(bucket,key,x,x,0)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {
        overlayWith: {
          bucket: 'bucket',
          key: 'key',
          alpha: '0',
          wRatio: undefined,
          hRatio: undefined,
          options: {}
        }
      };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('035/watermark/ratioDefined', () => {
    it('Should pass if the filter is successfully translated from Thumbor:watermark()', () => {
      // Arrange
      const edit = 'filters:watermark(bucket,key,100,100,0,10,10)';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {
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
      };
      expect(edits).toEqual(expectedResult);
    });
  });

  describe('036/elseCondition', () => {
    it('Should pass if undefined is returned for an unsupported filter', () => {
      // Arrange
      const edit = 'filters:notSupportedFilter()';
      const filetype = ImageFormatTypes.JPG;

      // Act
      const thumborMapper = new ThumborMapper();
      const edits = thumborMapper.mapFilter(edit, filetype);

      // Assert
      const expectedResult = {};
      expect(edits).toEqual(expectedResult);
    });
  });
});
