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
    const bmpMagicNumber = "424d";

    // Read the first 2 bytes of the file
    const fileSignature = imageBuffer.subarray(0, 2).toString("hex");

    // Compare the file signature with the magic number
    return fileSignature === bmpMagicNumber;
  }
}
