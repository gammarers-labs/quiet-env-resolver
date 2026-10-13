import { ProjenTypeScriptProject } from '@gammarers/projen-projects';
const project = new ProjenTypeScriptProject({
  name: 'quiet-env-resolver',
  repositoryUrl: 'https://github.com/gammarers-labs/quiet-env-resolver.git',
  description: 'A library for resolving environment variables in a quiet way.',
  keywords: ['environment', 'variables', 'resolver'],
  devDeps: [
    '@gammarers/projen-projects@^0.5.8',
  ],
});
project.synth();