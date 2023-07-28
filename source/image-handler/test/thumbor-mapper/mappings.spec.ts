// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageFitTypes, ImageFormatTypes } from "../../lib";
import { ThumborMapper } from "../../thumbor-mapper";

describe("mapBGColor", () => {
  it("Should map background rgb color with color object when color name string provided", () => {
    // Arrange
    const color = "red";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapBGColor"](color, currentEdits);

    // Assert
    expect(currentEdits.flatten).toEqual(expect.objectContaining({ background: { r: 255, g: 0, b: 0 } }));
  });

  it("Should map background rgb color with color object when color hex value", () => {
    // Arrange
    const color = "FF0000";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapBGColor"](color, currentEdits);

    // Assert
    expect(currentEdits.flatten).toEqual(expect.objectContaining({ background: { r: 255, g: 0, b: 0 } }));
  });
});

describe("mapBlur", () => {
  it("Should map sigma value the blur value when sigma can be converted to number", () => {
    // Arrange
    const blurValue = "50,20";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapBlur"](blurValue, currentEdits);

    // Assert
    expect(currentEdits.blur).toEqual(20);
  });

  it("Should map radius / 2 to the blur value when sigma can not be converted to number", () => {
    // Arrange
    const blurValue = "50";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapBlur"](blurValue, currentEdits);

    // Assert
    expect(currentEdits.blur).toEqual(25);
  });
});

describe("mapConvolution", () => {
  it("Should map the convolution matrix to the current edits", () => {
    // Arrange
    const convolutionValue = "1;2;3;4;5;6,2";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapConvolution"](convolutionValue, currentEdits);

    // Assert
    expect(currentEdits.convolve).toEqual(
      expect.objectContaining({
        height: 3,
        width: 2,
        kernel: [1, 2, 3, 4, 5, 6],
      })
    );
  });
});

describe("mapFill", () => {
  it("Should map resize fit and fill background rgb color with color object when color name string provided", () => {
    // Arrange
    const color = "red";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapFill"](color, currentEdits);

    // Assert
    expect(currentEdits.resize).toEqual(
      expect.objectContaining({
        fit: "contain",
        background: { r: 255, g: 0, b: 0 },
      })
    );
  });

  it("Should map resize fit fill background rgb color with color object when color hex value", () => {
    // Arrange
    const color = "FF0000";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapFill"](color, currentEdits);

    // Assert
    expect(currentEdits.resize).toEqual(
      expect.objectContaining({
        fit: "contain",
        background: { r: 255, g: 0, b: 0 },
      })
    );
  });
});

describe("mapFormat", () => {
  it("Should map the format value when it is an accepted format value", () => {
    // Arrange
    const formatType = "png";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapFormat"](formatType, currentEdits);

    // Assert
    expect(currentEdits.toFormat).toEqual(formatType);
  });

  it("Should map the format as jpeg when it is jpg", () => {
    // Arrange
    const formatType = "jpg";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapFormat"](formatType, currentEdits);

    // Assert
    expect(currentEdits.toFormat).toEqual("jpeg");
  });

  it("Should not map the format as jpeg when it is not an accepted value", () => {
    // Arrange
    const formatType = "pdf";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapFormat"](formatType, currentEdits);

    // Assert
    expect(currentEdits.toFormat).toEqual(undefined);
  });
});

describe("mapNoUpscale", () => {
  it("Should map resize without enlargement", () => {
    // Arrange
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapNoUpscale"](currentEdits);

    // Assert
    expect(currentEdits.resize.withoutEnlargement).toEqual(true);
  });
});

describe("mapResizeRatio", () => {
  it("Should replace width and height proportionally if they already exist", () => {
    // Arrange
    const ratioValue = "0.5";
    const currentEdits: Record<string, any> = { resize: { width: 10, height: 10 } };
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapResizeRatio"](ratioValue, currentEdits);

    // Assert
    expect(currentEdits.resize).toEqual(
      expect.objectContaining({
        width: 5,
        height: 5,
      })
    );
  });

  it("Should map resize ratio if width and height are not defined", () => {
    // Arrange
    const ratioValue = "0.5";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapResizeRatio"](ratioValue, currentEdits);

    // Assert
    expect(currentEdits.resize.ratio).toEqual(Number(ratioValue));
  });
});

describe("mapQuality", () => {
  it("Should map format and quality when it is a valid format", () => {
    // Arrange
    const qualityValue = "90";
    const formatType = ImageFormatTypes.JPG;
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapQuality"](qualityValue, currentEdits, formatType);

    // Assert
    expect(currentEdits.jpeg).toEqual({ quality: 90 });
  });

  it("Should not map format and quality when it is not a valid format", () => {
    // Arrange
    const qualityValue = "90";
    const formatType = "pdf";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapQuality"](qualityValue, currentEdits, formatType as ImageFormatTypes);

    // Assert
    expect(currentEdits.jpg).toEqual(undefined);
  });
});

describe("mapStretch", () => {
  it("Should map resize fit to fill if not already set to inside", () => {
    // Arrange
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapStretch"](currentEdits);

    // Assert
    expect(currentEdits.resize.fit).toEqual(ImageFitTypes.FILL);
  });

  it("Should not map resize fit to fill if it is already set to inside", () => {
    // Arrange
    const currentEdits: Record<string, any> = { resize: { fit: ImageFitTypes.INSIDE } };
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapStretch"](currentEdits);

    // Assert
    expect(currentEdits.resize.fit).toEqual(ImageFitTypes.INSIDE);
  });
});

describe("mapUpscale", () => {
  it("Should map resize fit to inside", () => {
    // Arrange
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapUpscale"](currentEdits);

    // Assert
    expect(currentEdits.resize.fit).toEqual(ImageFitTypes.INSIDE);
  });
});

describe("mapWatermark", () => {
  it("Should map overlayWith values with provided values if x and y pos are valid", () => {
    // Arrange
    const overlayValues = "bucket, key, 10, -20, 50, 30, 40";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapWatermark"](overlayValues, currentEdits);

    // Assert
    expect(currentEdits.overlayWith).toEqual(
      expect.objectContaining({
        bucket: "bucket",
        key: "key",
        alpha: "50",
        wRatio: "30",
        hRatio: "40",
        options: {
          left: "10",
          top: "-20",
        },
      })
    );
  });

  it("Should map overlayWith values without left option if x pos is invalid", () => {
    // Arrange
    const overlayValues = "bucket, key, invalid, -20, 50, 30, 40";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapWatermark"](overlayValues, currentEdits);

    // Assert
    expect(currentEdits.overlayWith).toEqual(
      expect.objectContaining({
        bucket: "bucket",
        key: "key",
        alpha: "50",
        wRatio: "30",
        hRatio: "40",
        options: {
          top: "-20",
        },
      })
    );
  });

  it("Should map overlayWith values without top option if  ypos is invalid", () => {
    // Arrange
    const overlayValues = "bucket, key, 10, invalid, 50, 30, 40";
    const currentEdits: Record<string, any> = {};
    const thumborMapper = new ThumborMapper();

    // Act
    thumborMapper["mapWatermark"](overlayValues, currentEdits);

    // Assert
    expect(currentEdits.overlayWith).toEqual(
      expect.objectContaining({
        bucket: "bucket",
        key: "key",
        alpha: "50",
        wRatio: "30",
        hRatio: "40",
        options: {
          left: "10",
        },
      })
    );
  });
});
