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

const VALIDATE_MISMATCH_MESSAGE = 'Environment variable did not match the expected shape';

/**
 * Passed to `onError` when `strict-env-resolver` rejects a value.
 *
 * The rejected value is omitted so logs do not include raw environment data.
 */
export class QuietEnvResolverValidateError extends QuietEnvResolverError {
  override readonly name: string = 'QuietEnvResolverValidateError';

  /**
   * @param message - Override for the default shape-mismatch message.
   */
  constructor(message: string = VALIDATE_MISMATCH_MESSAGE) {
    super(message);
    Object.setPrototypeOf(this, QuietEnvResolverValidateError.prototype);
  }
}
