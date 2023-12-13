import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  // external: @aws-sdk/* is provided by AWS Lambda Node Runtime
  external: ['@aws-sdk/client-rekognition', '@aws-sdk/client-s3']
})
