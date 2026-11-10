import {
  StrictEnvResolver,
  StrictEnvValidationError,
  type StrictEnvOptions,
  type StrictEnvSchema,
  type StrictEnvSchemaToType,
  type StrictEnvSpec,
  type StrictEnvSpecToType,
} from 'strict-env-resolver';
import {
  QuietEnvResolverValidateError,
  type QuietEnvResolverFailure,
} from './core/errors';

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
 * Copies each variable name and kind. The dependency message and raw value are dropped.
 * Other thrown values stay as they are.
 *
 * @param error - Caught exception.
 * @returns Value passed to `onError`.
 */
const toQuietError = (error: unknown): unknown => {
  if (!(error instanceof StrictEnvValidationError)) {
    return error;
  }

  // `message` and `raw` include the rejected value. Keep the name and kind only.
  const failures: readonly QuietEnvResolverFailure[] = error.errors.map((entry) => ({
    key: entry.key,
    kind: entry.kind,
  }));

  return new QuietEnvResolverValidateError(failures);
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

/**
 * Reads one variable after the call arguments are split.
 *
 * @param key - Environment variable name.
 * @param spec - Type spec. Omitted reads a string.
 * @param options - `{ default, trim }`. `onError` on this object is not forwarded.
 * @param onError - Failure callback.
 * @returns Parsed value, or `undefined` when resolution fails.
 */
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
 * Narrows each argument at runtime.
 * An arrow function cannot declare overloads, so {@link QuietResolve} is applied with a cast.
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
 * Forwards the schema read and reports one validation error for the whole schema.
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
 * const port = QuietEnvResolver.resolve('PORT', StrictEnvType.Number.Port, {
 *   default: 3000,
 *   onError: (error) => {
 *     if (error instanceof QuietEnvResolverValidateError) {
 *       console.error(error.failures);
 *       return;
 *     }
 *     console.error('failed to parse config', error);
 *   },
 * });
 * ```
 */
export const QuietEnvResolver = {
  /**
   * Reads one environment variable.
   *
   * `onError` sits on {@link QuietEnvOptions} next to `default` and `trim`.
   * A trailing {@link QuietEnvOnError} callback or {@link QuietEnvHandler} still works.
   * Validation failures become {@link QuietEnvResolverValidateError}. Other thrown
   * values are passed through. Nothing is thrown when `onError` is omitted.
   *
   * @param key - Environment variable name.
   * @param spec - Type spec. Defaults to string when omitted.
   * @param options - Optional `{ default, trim, onError }`.
   * @param onError - Trailing callback or `{ onError }`. When both this and `options.onError` are set, this one is used.
   * @returns Parsed value, or `undefined` when resolution fails.
   */
  resolve,
  /**
   * Reads every variable in a schema.
   *
   * One validation error is reported for the whole schema. `failures` keeps every
   * failed key and kind. Pass a {@link QuietEnvHandler}. A {@link QuietEnvOnError}
   * callback still works.
   *
   * @param schema - Map of env names to specs or `[spec, options]` tuples.
   * @param onErrorOrHandler - `QuietEnvHandler`, or a trailing callback.
   * @returns Parsed object, or `undefined` when resolution fails.
   */
  resolves,
};
