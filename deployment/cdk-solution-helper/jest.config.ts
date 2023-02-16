/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from "jest";

const config: Config = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  transform: {
    "^.+\\.(t)sx?$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.ts", "!**/*.test.ts", "!./jest.config.ts", "!./jest.setup.ts"],
  coverageReporters: [["lcov", { projectRoot: "../" }], "text"],
};

export default config;
