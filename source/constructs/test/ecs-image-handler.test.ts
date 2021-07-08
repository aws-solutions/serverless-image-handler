import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { ECSImageHandlerStack } from '../lib/constructs-stack';

test('Snapshot', () => {
  const app = new App();
  const stack = new ECSImageHandlerStack(app, 'test');

  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});