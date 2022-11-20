// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockAwsSecretManager } from "./mock";
import SecretsManager from "aws-sdk/clients/secretsmanager";
import { SecretProvider } from "../secret-provider";

describe("index", () => {
  const secretsManager = new SecretsManager();

  afterEach(() => {
    mockAwsSecretManager.getSecretValue.mockReset();
  });

  it("Should get a secret from secret manager if the cache is empty", async () => {
    mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ SecretString: "secret_value" });
      },
    }));

    const secretProvider = new SecretProvider(secretsManager);
    const secretKeyFistCall = await secretProvider.getSecret("secret_id");
    const secretKeySecondCall = await secretProvider.getSecret("secret_id");

    expect(secretKeyFistCall).toEqual("secret_value");
    expect(secretKeySecondCall).toEqual("secret_value");
    expect(mockAwsSecretManager.getSecretValue).toBeCalledTimes(1);
    expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({
      SecretId: "secret_id",
    });
  });

  it("Should get a secret from secret manager and invalidate the cache", async () => {
    mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ SecretString: "secret_value_1" });
      },
    }));
    mockAwsSecretManager.getSecretValue.mockImplementationOnce(() => ({
      promise() {
        return Promise.resolve({ SecretString: "secret_value_2" });
      },
    }));

    const secretProvider = new SecretProvider(secretsManager);
    const getSecretKeyFistCall = await secretProvider.getSecret("secret_id_1");
    const getSecretKeySecondCall = await secretProvider.getSecret("secret_id_2");
    const getSecretKeyThirdCall = await secretProvider.getSecret("secret_id_2");

    expect(getSecretKeyFistCall).toEqual("secret_value_1");
    expect(getSecretKeySecondCall).toEqual("secret_value_2");
    expect(getSecretKeyThirdCall).toEqual("secret_value_2");
    expect(mockAwsSecretManager.getSecretValue).toBeCalledTimes(2);
    expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({
      SecretId: "secret_id_1",
    });
    expect(mockAwsSecretManager.getSecretValue).toHaveBeenCalledWith({
      SecretId: "secret_id_2",
    });
  });
});
