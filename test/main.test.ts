import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { ImageHandlerStack } from '../src/main';

test('Snapshot', () => {
  const app = new App();
  const stack = new ImageHandlerStack(app, 'test');

  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});