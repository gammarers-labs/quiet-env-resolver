# Quiet Env Resolver

[![npm version](https://img.shields.io/npm/v/quiet-env-resolver?style=flat-square)](https://www.npmjs.com/package/quiet-env-resolver)
[![license](https://img.shields.io/npm/l/quiet-env-resolver?style=flat-square)](https://www.npmjs.com/package/quiet-env-resolver)
[![Node.js](https://img.shields.io/node/v/quiet-env-resolver?style=flat-square)](https://www.npmjs.com/package/quiet-env-resolver)
[![build](https://img.shields.io/github/actions/workflow/status/gammarers-labs/quiet-env-resolver/build.yml?label=build&style=flat-square)](https://github.com/gammarers-labs/quiet-env-resolver/actions/workflows/build.yml)

Resolves environment variables without throwing. Wraps `strict-env-resolver` and reports failures through an `onError` callback.

## Features

- Reads `string`, `number`, `boolean`, and `enum` environment variables with the same specs as `strict-env-resolver`
- Reports a failure through an optional `onError` instead of throwing
- Passes shape mismatches as `QuietEnvResolverValidateError`, listing each failed name and kind without the rejected value, and leaves any other thrown value unchanged
- Resolves one variable with `resolve`, or every key in a schema with `resolves`

## How it works

`resolve` and `resolves` call `strict-env-resolver`. That library throws when a variable is missing or invalid. This package catches the throw. A validation failure is passed to `onError` as `QuietEnvResolverValidateError`. `failures` lists each variable name and kind (`missing`, `invalid_number`, `invalid_boolean`, or `invalid_enum`). The message is built from that list and does not include the rejected value. `resolves` calls `onError` once for the whole schema and keeps every failed key on that error. Any other thrown value is passed through unchanged. `onError` is optional: a callback, or `{ onError }` as the last argument. After a failure the call returns `undefined`. `default` is still the strict fallback for a missing value, and a missing value that uses `default` does not call `onError`.

## Installation

### npm

```bash
npm install quiet-env-resolver
```

### yarn

```bash
yarn add quiet-env-resolver
```

### pnpm

```bash
pnpm add quiet-env-resolver
```

## Usage

```ts
import { QuietEnvResolver, StrictEnvType } from 'quiet-env-resolver';

const port = QuietEnvResolver.resolve('PORT', StrictEnvType.Number.Port, { default: 3000 });
```

`port` is `3000` when `PORT` is unset, the parsed number when `PORT` is valid, and `undefined` when parsing fails. No error is thrown.

Pass `onError` as the last argument. A function and `{ onError }` are both accepted:

```ts
import { QuietEnvResolver, QuietEnvResolverValidateError, StrictEnvType } from 'quiet-env-resolver';

const fromInvalid = QuietEnvResolver.resolve('PORT', StrictEnvType.Number.Port, (error) => {
  console.error('failed to parse config', error);
});

const checked = QuietEnvResolver.resolve('PORT', StrictEnvType.Number.Port, { default: 3000 }, {
  onError: (error) => {
    if (error instanceof QuietEnvResolverValidateError) {
      console.error(error.failures);
      return;
    }
    console.error('failed to parse config', error);
  },
});
```

Check `QuietEnvResolverValidateError` before `QuietEnvResolverError`. Each failure is `{ key, kind }`. The message lists those names and kinds and does not include the rejected value.

Several variables in one call:

```ts
const envs = QuietEnvResolver.resolves({
  PORT: [StrictEnvType.Number.Port, { default: 3000 }],
  DEBUG: [StrictEnvType.Boolean, { default: false }],
  MODE: StrictEnvType.Enum(['read', 'write'] as const),
}, {
  onError: (error) => {
    if (error instanceof QuietEnvResolverValidateError) {
      // [{ key: 'PORT', kind: 'missing' }, { key: 'MODE', kind: 'invalid_enum' }]
      console.error(error.failures);
      return;
    }
    console.error('failed to parse config', error);
  },
});
```

## Options

### `QuietEnvResolver.resolve(key, spec?, options?, onError?)`

| Argument | Required | Description |
|----------|----------|-------------|
| **key** | Yes | Environment variable name (for example `"PORT"`). |
| **spec** | No | Type spec. Defaults to `StrictEnvType.String`. Use `StrictEnvType.String`, `StrictEnvType.Number` (or a preset such as `Number.Port`), `StrictEnvType.Boolean` (or `Boolean.Literal`), or `StrictEnvType.Enum(choices)`. `Boolean.Literal` accepts only `true` / `false`. Any other non-empty value outside the boolean vocabulary fails with `invalid_boolean`. |
| **options** | No | `{ default, trim }` forwarded to `strict-env-resolver`. `onError` may sit on this object. |
| **onError** | No | Last argument. A callback `(error: unknown) => void`, or `{ onError }`. |

### `QuietEnvResolver.resolves(schema, onError?)`

| Argument | Required | Description |
|----------|----------|-------------|
| **schema** | Yes | Object whose keys are env names. Each value is a spec, or a `[spec, options]` tuple. |
| **onError** | No | Last argument. A callback, or `{ onError }`. Called once. `QuietEnvResolverValidateError.failures` lists every failed key and kind. |

### `onError`

| Field | Type | Description |
|-------|------|-------------|
| **onError** | `QuietEnvOnError` | Optional. Validation failures are `QuietEnvResolverValidateError` with `failures` of `{ key, kind }`. Other thrown values are unchanged. Not called when `default` covers a missing value. |

A successful call returns the parsed value and does not call `onError`. A failed call calls `onError` when it was passed, then returns `undefined`. An exception thrown by `onError` propagates to the caller. Omitting `onError` still returns `undefined` and does not throw.

## Requirements

- **Node.js** >= 20.0.0

## License

This project is licensed under the Apache-2.0 License.
