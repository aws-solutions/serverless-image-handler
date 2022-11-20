// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import SecretsManager from "aws-sdk/clients/secretsmanager";

/**
 * Class provides cached access to the Secret Manager.
 */
export class SecretProvider {
  private readonly cache: { secretId: string; secret: string } = {
    secretId: null,
    secret: null,
  };

  constructor(private readonly secretsManager: SecretsManager) {}

  /**
   * Returns the secret associated with the secret ID.
   * Note: method caches the secret associated with `secretId` and makes a call to SecretManager
   * in case if the `secretId` changes, i.e. when SECRETS_MANAGER environment variable values changes.
   * @param secretId The secret ID.
   * @returns Secret associated with the secret ID.
   */
  async getSecret(secretId: string): Promise<string> {
    if (this.cache.secretId === secretId && this.cache.secret) {
      return this.cache.secret;
    } else {
      const response = await this.secretsManager.getSecretValue({ SecretId: secretId }).promise();
      this.cache.secretId = secretId;
      this.cache.secret = response.SecretString;

      return this.cache.secret;
    }
  }
}
