// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Based on Thumbor mapper
// SPDX-License-Identifier: Apache-2.0

import { ImageEdits, ImageFitTypes, ImageFormatTypes, ImageHandlerError, ImageHandlerEvent, StatusCodes } from "./lib";

export class SemanticMapper {
  private readonly EMPTY_IMAGE_EDITS: ImageEdits = {};
  private originalFormat: string;
  private isSvg: boolean;

  /**
   * Initializer function for creating a new Custom mapping, used by the image
   * handler to perform image modifications based on legacy URL path requests.
   * @param path The request path.
   * @returns Image edits based on the request path.
   */
  public mapPathToEdits(event: ImageHandlerEvent): ImageEdits {
    this.setOriginalFormat(event.path);

    const { h, w, fit, fm, q } = event.multiValueQueryStringParameters || {};

    if ([h, w, fit, fm, q].some(p => p?.length > 1)) {
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        "MapPathToEdits::MultipleValuesNotAllowed",
        "Multiple values for the same parameter are not allowed."
      );

    }

    let edits: ImageEdits = this.mergeEdits(
      this.mapFormat(event),
      this.mapResize(event.queryStringParameters),
      this.mapFitIn(event.queryStringParameters?.fit));

    return edits;
  }

  /**
   * Maps the image path to resize image edit.
   * @param queryParams Querry params optionally containing w for width and h for height.
   * @returns Image edits associated with resize.
   */
  private mapResize(queryParams: {
    h?: string | number,
    w?: string | number
  }): ImageEdits {

    if (this.isSvg || (!queryParams?.w && !queryParams?.h)) {
      return this.EMPTY_IMAGE_EDITS;
    }

    const [width, height] = [queryParams.w, queryParams.h].map((dim) => {
      const intDim = parseInt(dim as string);
      return isNaN(intDim) ? null : intDim;
    });

    const resizeEdit: ImageEdits = { resize: {} };
    // If width or height is null or missing, fit would be inside.
    if (width === null || height === null) {
      resizeEdit.resize.fit = ImageFitTypes.INSIDE;
    }
    resizeEdit.resize.width = width === 0 ? null : width;
    resizeEdit.resize.height = height === 0 ? null : height;

    return resizeEdit;
  }

  /**
   * Maps the image path to fit image edit.
   * @param path An image path.
   * @returns Image edits associated with fit-in filter.
   */
  private mapFitIn(fit: ImageFitTypes): ImageEdits {

    // Allow for thumb to be used as synonym for cover
    if ((fit as any) === "thumb") {
      return { resize: { fit: ImageFitTypes.COVER } };
    }

    if (Object.values(ImageFitTypes).includes(fit)) {
      return { resize: { fit } };
    }

    return this.EMPTY_IMAGE_EDITS;
  }

  /**
   * A helper method to merge edits.
   * @param edits Edits to merge.
   * @returns Merged edits.
   */
  private mergeEdits(...edits: ImageEdits[]) {
    return edits.reduce((result, current) => {
      Object.keys(current).forEach((key) => {
        if (Array.isArray(result[key]) && Array.isArray(current[key])) {
          result[key] = Array.from(new Set(result[key].concat(current[key])));
        } else if (this.isObject(result[key]) && this.isObject(current[key])) {
          result[key] = this.mergeEdits(result[key], current[key]);
        } else {
          result[key] = current[key];
        }
      });

      return result;
    }, {});
  }

  /**
   * A helper method to check whether a passed argument is object or not.
   * @param obj Object to check.
   * @returns Whether or not a passed argument is object.
   */
  private isObject(obj: unknown): boolean {
    return obj && typeof obj === "object" && !Array.isArray(obj);
  }

  private setOriginalFormat(path: string) {
    this.originalFormat = path.substring(path.lastIndexOf(".") + 1).toLocaleLowerCase();
    this.isSvg = this.originalFormat === "svg";
  }

  /**
   * Maps the image path to format image edit.
   * @param path An image path.
   * @returns Image edits associated with format.
   */
  private mapFormat(event: ImageHandlerEvent): ImageEdits {
    const { fm: targetFormat, q: qualityParam } = event.queryStringParameters || {};
    const originalFormat = this.originalFormat as ImageFormatTypes;
    const format = targetFormat || originalFormat;
    const isJpeg = ['jpg', 'jpeg'].includes(targetFormat);
    const quality = parseInt(qualityParam as string, 10);

    if (targetFormat && !Object.values(ImageFormatTypes).includes(targetFormat as ImageFormatTypes)) {
      throw new ImageHandlerError(
        StatusCodes.BAD_REQUEST,
        "MapFormat::UnsupportedImageFormat",
       `Unsupported image format: ${targetFormat}`
      );
    }

    const edits: ImageEdits = {
      ...(targetFormat && { toFormat: targetFormat }),
      ...(qualityParam && !isNaN(quality) && { [format]: { quality } }),
      ...(isJpeg && !qualityParam && { jpeg: { quality: 60 } }),
    };

    return edits;
  }
}
