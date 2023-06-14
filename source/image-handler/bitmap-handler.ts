// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Jimp from "jimp";
import { ImageHandlerError, StatusCodes } from "./lib";

export class BitmapRequest {
  public convertToPng = async (imageBuffer: Buffer): Promise<Buffer> => {
    try {
      const image = await Jimp.read(imageBuffer);
      const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
      return buffer;
    } catch (err) {
      console.error("Error getting image buffer:", err);
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        "BitmapRequest::convertToPng",
        "It was not possible to convert buffer to png buffer"
      );
    }
  };

  public isBmp(imageBuffer: Buffer): boolean {
    const imageSignature = imageBuffer.subarray(0, 4).toString("hex").toUpperCase();
    if (
      imageSignature === "89504E47" ||
      imageSignature === "FFD8FFDB" ||
      imageSignature === "FFD8FFE0" ||
      imageSignature === "FFD8FFEE" ||
      imageSignature === "FFD8FFE1" ||
      imageSignature === "52494646" ||
      imageSignature === "49492A00" ||
      imageSignature === "4D4D002A"
    ) {
      return false;
    } else {
      const bmpMagicNumber = "424d";
      const fileSignature = imageBuffer.subarray(0, 2).toString("hex");
      return fileSignature === bmpMagicNumber;
    }
  }
}
