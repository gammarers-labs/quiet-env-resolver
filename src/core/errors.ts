/**
 * Base error for quiet-env-resolver.
 *
 * Resolution failures are not thrown. Callers receive them through `onError`.
 * Check {@link QuietEnvResolverValidateError} before this base class.
 *
 * @example
 * ```ts
 * if (error instanceof QuietEnvResolverValidateError) {
 *   return;
 * }
 * if (error instanceof QuietEnvResolverError) {
 *   // Other errors raised by this package.
 * }
 * ```
 */
export abstract class QuietEnvResolverError extends Error {
  override readonly name: string = 'QuietEnvResolverError';

  /**
   * @param message - Error message.
   */
  protected constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, QuietEnvResolverError.prototype);
  }
}

/**
 * Why a variable was rejected.
 *
 * Same categories as `strict-env-resolver`: unset or empty (`missing`),
 * a value that is not a finite number (`invalid_number`), a value outside the
 * boolean vocabulary (`invalid_boolean`), or a value outside the enum choices
 * (`invalid_enum`).
 */
export type QuietEnvResolverFailureKind = 'missing' | 'invalid_number' | 'invalid_boolean' | 'invalid_enum';

/**
 * One variable that failed validation.
 *
 * The raw value is not stored.
 */
export type QuietEnvResolverFailure = {
  /** Environment variable name. */
  readonly key: string;
  /** Failure category. */
  readonly kind: QuietEnvResolverFailureKind;
};

/**
 * Builds the display message from variable names and kinds.
 * Rejected values are left out so the text is safe to log.
 *
 * @param failures - Failed variables.
 * @returns Multi-line summary. One line per failure.
 */
const formatFailures = (failures: readonly QuietEnvResolverFailure[]): string => {
  const lines = failures.map((failure) => `- ${failure.key}: ${failure.kind}`);
  return `Invalid environment variables (${failures.length}):\n${lines.join('\n')}`;
};

/**
 * Passed to `onError` when `strict-env-resolver` rejects one or more values.
 *
 * {@link QuietEnvResolverValidateError.failures} lists each variable name and kind.
 * The message is built from that list. Rejected values are omitted so logs do not
 * include raw environment data.
 *
 * @example
 * ```ts
 * if (error instanceof QuietEnvResolverValidateError) {
 *   console.error(error.failures);
 * }
 * ```
 */
export class QuietEnvResolverValidateError extends QuietEnvResolverError {
  override readonly name: string = 'QuietEnvResolverValidateError';

  /**
   * Failed variables. Each entry is a name and a kind. The rejected value is omitted.
   */
  readonly failures: readonly QuietEnvResolverFailure[];

  /**
   * @param failures - Failed variables. The message lists their names and kinds only.
   */
  constructor(failures: readonly QuietEnvResolverFailure[]) {
    super(formatFailures(failures));
    Object.setPrototypeOf(this, QuietEnvResolverValidateError.prototype);
    this.failures = failures.map((failure) => ({
      key: failure.key,
      kind: failure.kind,
    }));
  }
}
