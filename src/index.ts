/**
 * Public entry for quiet-env-resolver.
 * Re-exports the quiet resolver, package errors, and the spec types callers need.
 * Implementation lives in the resolver module and in core.
 */
export { QuietEnvResolver } from './resolver';

export type { QuietEnvHandler, QuietEnvOnError, QuietEnvOptions } from './resolver';

export { QuietEnvResolverError, QuietEnvResolverValidateError } from './core/errors';

export { StrictEnvType } from 'strict-env-resolver';

export type {
  StrictEnvNumberConstraints,
  StrictEnvOptions,
  StrictEnvSchema,
  StrictEnvSchemaEntry,
  StrictEnvSchemaToType,
  StrictEnvSpec,
  StrictEnvSpecToType,
  StrictEnvTypeBoolean,
  StrictEnvTypeEnum,
  StrictEnvTypeNumber,
  StrictEnvTypeString,
} from 'strict-env-resolver';
