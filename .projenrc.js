const { AwsCdkTypeScriptApp, TypeScriptAppProject } = require('projen');
const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.110.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-image-handler',
  // projenVersion: '^0.24.12',
  cdkDependencies: [
    /* Which AWS CDK modules (those that start with "@aws-cdk/") this app uses. */
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/aws-ecs-patterns',
  ],
  // deps: [],                          /* Runtime dependencies of this module. */
  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                       /* Build dependencies for this module. */
  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // releaseWorkflow: undefined,        /* Define a GitHub workflow for releasing from "main" when new versions are bumped. */
});
const app = new TypeScriptAppProject({
  parent: project,
  defaultReleaseBranch: 'main',
  name: 'app',
  outdir: './src/app',

  deps: [
    /* Runtime dependencies of this module. */
    'koa',
  ],
  devDeps: [
    /* Build dependencies for this module. */
    '@types/koa',
    'ts-node',
    'nodemon',
  ],
  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // release: undefined,                /* Add release management to this project. */
  scripts: {
    'watch-server': 'nodemon --ignore test/ --watch src -e ts,tsx --exec ts-node src/index.ts',
    'serve': 'node lib/index.js',
  },
});

project.synth();