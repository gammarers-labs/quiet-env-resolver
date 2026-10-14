import {
  StrictEnvResolver,
  StrictEnvValidationError,
  type StrictEnvOptions,
  type StrictEnvSchema,
  type StrictEnvSchemaToType,
  type StrictEnvSpec,
  type StrictEnvSpecToType,
} from 'strict-env-resolver';
import { QuietEnvResolverValidateError } from './core/errors';

/**
 * Called when resolution fails.
 *
 * A shape mismatch is a {@link QuietEnvResolverValidateError}. Any other thrown
 * value is passed through. Omitted callbacks are not invoked.
 */
export type QuietEnvOnError = (error: unknown) => void;

/**
 * Last-argument object form, matching `onError` inside quiet-json-parser options.
 */
export type QuietEnvHandler = {
  /** Receives the failure. The resolver does not throw. */
  readonly onError: QuietEnvOnError;
};

/**
 * `strict-env-resolver` options, plus an optional `onError` on the same object.
 *
 * @typeParam S - Environment variable spec.
 */
export type QuietEnvOptions<S extends StrictEnvSpec = StrictEnvSpec> = StrictEnvOptions<S> & {
  /** Called when this read fails. Same callback as the trailing `onError` argument. */
  readonly onError?: QuietEnvOnError;
};

/**
 * True for a trailing callback.
 * `StrictEnvType.Number` is callable and also has `type`, so it stays a spec.
 *
 * @param value - Candidate argument.
 * @returns Whether `value` is an `onError` callback.
 */
const isOnError = (value: unknown): value is QuietEnvOnError => {
  if (typeof value !== 'function') {
    return false;
  }

  if ('type' in value) {
    return false;
  }

  return true;
};

/**
 * True for `{ onError }` when that object is not a spec or a `{ default, trim }` bag.
 *
 * @param value - Candidate argument.
 * @returns Whether `value` is a handler object.
 */
const isOnErrorHandler = (value: unknown): value is QuietEnvHandler => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('onError' in value) || typeof value.onError !== 'function') {
    return false;
  }

  if ('type' in value || 'default' in value || 'trim' in value) {
    return false;
  }

  return true;
};

/**
 * Reads `onError` from a callback, a handler object, or options that include it.
 *
 * @param value - Trailing argument or options bag.
 * @returns The callback, or `undefined` when the caller did not pass one.
 */
const onErrorFrom = (value: unknown): QuietEnvOnError | undefined => {
  if (isOnError(value)) {
    return value;
  }

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  if (!('onError' in value)) {
    return undefined;
  }

  // `in` does not narrow the property to a callback.
  const callback: unknown = value.onError;
  if (!isOnError(callback)) {
    return undefined;
  }

  return callback;
};

/**
 * Maps a thrown validation error onto this package's error.
 * Other thrown values stay as they are.
 *
 * @param error - Caught exception.
 * @returns Value passed to `onError`.
 */
const toQuietError = (error: unknown): unknown => {
  if (!(error instanceof StrictEnvValidationError)) {
    return error;
  }

  return new QuietEnvResolverValidateError();
};

/**
 * Runs a strict read. Failures go to `onError` and become `undefined`.
 * `onError` is outside the assignment so a handler failure is not caught again.
 *
 * @param read - Strict resolver call.
 * @param onError - Optional failure callback.
 * @returns Parsed value, or `undefined` after a failure.
 */
const reportQuietly = <T>(read: () => T, onError?: QuietEnvOnError): T | undefined => {
  let value: T;

  try {
    value = read();
  } catch (error) {
    onError?.(toQuietError(error));
    return undefined;
  }

  return value;
};

/**
 * `strict-env-resolver` reads `default` and `trim` only. A sibling `onError` is ignored there.
 *
 * @param value - Caller options, which may also carry `onError`.
 * @returns Options safe to forward.
 */
const asStrictOptions = (value: object): StrictEnvOptions<StrictEnvSpec> => (
  value as StrictEnvOptions<StrictEnvSpec>
);

const readOne = (
  key: string,
  spec: StrictEnvSpec | undefined,
  options: object | undefined,
  onError: QuietEnvOnError | undefined,
): string | number | boolean | undefined => {
  if (spec === undefined) {
    return reportQuietly(() => StrictEnvResolver.resolve(key), onError);
  }

  if (options === undefined) {
    return reportQuietly(() => StrictEnvResolver.resolve(key, spec), onError);
  }

  return reportQuietly(
    () => StrictEnvResolver.resolve(key, spec, asStrictOptions(options)),
    onError,
  );
};

type QuietResolve = {
  <K extends string>(key: K, onError?: QuietEnvOnError | QuietEnvHandler): string | undefined;
  <K extends string, S extends StrictEnvSpec>(
    key: K,
    spec: S,
    onError?: QuietEnvOnError | QuietEnvHandler,
  ): StrictEnvSpecToType<S> | undefined;
  <K extends string, S extends StrictEnvSpec>(
    key: K,
    spec: S,
    options: QuietEnvOptions<S>,
    onError?: QuietEnvOnError | QuietEnvHandler,
  ): StrictEnvSpecToType<S> | undefined;
};

/**
 * Reads one environment variable.
 *
 * The last argument is optional. It may be an `onError` callback or `{ onError }`.
 * `onError` may also sit on the options object next to `default` and `trim`.
 * Validation failures become {@link QuietEnvResolverValidateError}. Other thrown
 * values are passed through. Nothing is thrown when `onError` is omitted.
 *
 * Overload signatures are what callers see. The implementation narrows each
 * argument shape at runtime because an arrow function cannot declare overloads.
 *
 * @param key - Environment variable name.
 * @param spec - Type spec. Defaults to string when omitted.
 * @param options - Optional `{ default, trim, onError }`.
 * @param onError - Callback or `{ onError }`, used when it is not already on `options`.
 * @returns Parsed value, or `undefined` when resolution fails.
 */
const resolve = ((
  key: string,
  second?: StrictEnvSpec | QuietEnvOnError | QuietEnvHandler,
  third?: QuietEnvOptions<StrictEnvSpec> | QuietEnvOnError | QuietEnvHandler,
  fourth?: QuietEnvOnError | QuietEnvHandler,
): string | number | boolean | undefined => {
  if (second === undefined) {
    return readOne(key, undefined, undefined, undefined);
  }

  if (isOnError(second) || isOnErrorHandler(second)) {
    return readOne(key, undefined, undefined, onErrorFrom(second));
  }

  if (third === undefined) {
    return readOne(key, second, undefined, undefined);
  }

  if (isOnError(third) || isOnErrorHandler(third)) {
    return readOne(key, second, undefined, onErrorFrom(third));
  }

  // Fourth argument wins when both the options bag and the last argument set onError.
  return readOne(key, second, third, onErrorFrom(fourth) ?? onErrorFrom(third));
}) as QuietResolve;

/**
 * Reads every variable in `schema`.
 *
 * One validation failure is reported once. `onError` is optional and may be a
 * callback or `{ onError }`.
 *
 * @param schema - Map of env names to specs or `[spec, options]` tuples.
 * @param onErrorOrHandler - Optional callback or `{ onError }`.
 * @returns Parsed object, or `undefined` when resolution fails.
 */
const resolves = <TSchema extends StrictEnvSchema>(
  schema: TSchema,
  onErrorOrHandler?: QuietEnvOnError | QuietEnvHandler,
): StrictEnvSchemaToType<TSchema> | undefined => reportQuietly(
  () => StrictEnvResolver.resolves(schema),
  onErrorFrom(onErrorOrHandler),
);

/**
 * Quiet wrapper around `strict-env-resolver`.
 *
 * @example
 * ```ts
 * const port = QuietEnvResolver.resolve('PORT', StrictEnvType.Number.Port, { default: 3000 }, {
 *   onError: (error) => {
 *     if (error instanceof QuietEnvResolverValidateError) {
 *       console.error('config shape mismatch');
 *       return;
 *     }
 *     console.error('failed to parse config', error);
 *   },
 * });
 * ```
 */
export const QuietEnvResolver = {
  /** Reads and parses a single environment variable. See {@link resolve}. */
  resolve,
  /** Reads and parses every variable in a schema. See {@link resolves}. */
  resolves,
};
