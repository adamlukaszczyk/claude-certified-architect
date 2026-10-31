// cucumber.js - Cucumber profile config
module.exports = {
  default: {
    paths: ['test/e2e/features/**/*.feature'],
    require: [
      'test/e2e/support/*.ts',
      'test/e2e/step-definitions/**/*.ts',
    ],
    requireModule: ['ts-node/register'],
    format: ['progress-bar'],
    tags: 'not @wip',
    publishQuiet: true,
  },
  smoke: {
    paths: ['test/e2e/features/**/*.feature'],
    require: [
      'test/e2e/support/*.ts',
      'test/e2e/step-definitions/**/*.ts',
    ],
    requireModule: ['ts-node/register'],
    format: ['progress-bar'],
    tags: '@smoke and not @wip',
    publishQuiet: true,
  },
  'smoke:verbose': {
    paths: ['test/e2e/features/**/*.feature'],
    require: [
      'test/e2e/support/*.ts',
      'test/e2e/step-definitions/**/*.ts',
    ],
    requireModule: ['ts-node/register'],
    format: ['./test/e2e/support/pretty-formatter.mjs'],
    tags: '@smoke and not @wip',
    publishQuiet: true,
  },
}
