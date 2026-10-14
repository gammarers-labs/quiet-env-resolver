import { ProjenTypeScriptProject } from '@gammarers/projen-projects';
const project = new ProjenTypeScriptProject({
  name: 'quiet-env-resolver',
  repositoryUrl: 'https://github.com/gammarers-labs/quiet-env-resolver.git',
  description: 'A library for resolving environment variables in a quiet way.',
  keywords: ['environment', 'variables', 'resolver'],
  deps: [
    'strict-env-resolver@^0.8.0',
  ],
  devDeps: [
    '@gammarers/projen-projects@^0.5.8',
  ],
  releaseToNpm: true,
});
project.synth();