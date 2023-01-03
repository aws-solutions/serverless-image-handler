// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Indicates whether a specified string is null, empty, or consists only of white-space characters.
 * @param str String to test.
 * @returns `true` if the `str` parameter is null or empty, or if value consists exclusively of white-space characters.
 */
export function isNullOrWhiteSpace(str: string): boolean {
  return !str || str.replace(/\s/g, "") === "";
}

/**
 * Determine if this appears to be json or a plain string
 * @param str Input string to evaluate
 * @returns Either a json object or a plain string
 */
export function parseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return [str];
  }
}

/**
 * Given a string that may describe actions in an image request, create a regex from the string
 * @param matchPattern string to operate on
 * @returns regex
 */
export function generateRegExp(matchPattern) {
  const patternStrings = matchPattern.split("/");
  const flags = patternStrings.pop();
  const parsedPatternString = matchPattern.slice(1, matchPattern.length - 1 - flags.length);
  return new RegExp(parsedPatternString, flags);
}
