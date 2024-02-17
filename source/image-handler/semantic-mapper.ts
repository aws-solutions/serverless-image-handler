// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// Based on Thumbor mapper
// SPDX-License-Identifier: Apache-2.0

import { ImageEdits, ImageFitTypes, ImageFormatTypes } from "./lib";

export class SemanticMapper {
  private static readonly EMPTY_IMAGE_EDITS: ImageEdits = {};

  /**
   * Initializer function for creating a new Custom mapping, used by the image
   * handler to perform image modifications based on legacy URL path requests.
   * @param path The request path.
   * @returns Image edits based on the request path.
   */
  public mapPathToEdits(path: string): ImageEdits {
    const fileFormat = this.extractFileFormat(path);

    let edits: ImageEdits = this.mergeEdits(this.mapResize(path), this.mapFitIn(path));

    return edits;
  }

  /**
   * Maps the image path to resize image edit.
   * @param path An image path.
   * @returns Image edits associated with resize.
   */
  private mapResize(path: string): ImageEdits {
    const url = this.getUrlObject(path);

    // Extract query parameters (w and h)
    const queryParams = new URLSearchParams(url.search);
    const width = Number(queryParams.get("w"));
    const height = Number(queryParams.get("h"));

    const resizeEdit: ImageEdits = { resize: {} };

    // If width or height is 0 or missing, fit would be inside.
    if (width === 0 || height === 0) {
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
  private mapFitIn(path: string): ImageEdits {
    const url = this.getUrlObject(path);

    // Extract query parameters (w and h)
    const queryParams = new URLSearchParams(url.search);
    return queryParams.get("fit") === "thumb"
      ? { resize: { fit: ImageFitTypes.COVER } }
      : SemanticMapper.EMPTY_IMAGE_EDITS;
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

  private getUrlObject = (path: string) => {
    if (path.startsWith("http")) {
      return new URL(path);
    } else {
      return new URL(path, "https://dummy.net");
    }
  };

  private extractFileFormat(path: string): ImageFormatTypes {
    const matchResult = path.match(/\.([a-z0-9]+)(\?|$)/i);
    if (matchResult) {
      const format = matchResult[1].toUpperCase();
      if (format in ImageFormatTypes) {
        return ImageFormatTypes[format as keyof typeof ImageFormatTypes];
      }
    }
  }
}
