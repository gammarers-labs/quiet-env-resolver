import { StrictEnvResolver, StrictEnvValidationError } from 'strict-env-resolver';
import {
  QuietEnvResolver,
  QuietEnvResolverError,
  QuietEnvResolverValidateError,
  StrictEnvType,
} from '../src';

const PORT = 'QUIET_ENV_RESOLVER_PORT';
const MODE = 'QUIET_ENV_RESOLVER_MODE';
const DEBUG = 'QUIET_ENV_RESOLVER_DEBUG';
const NAME = 'QUIET_ENV_RESOLVER_NAME';
const SHAPE_MISMATCH = 'Environment variable did not match the expected shape';

describe('QuietEnvResolver', () => {
  const onError = jest.fn();

  afterEach(() => {
    delete process.env[PORT];
    delete process.env[MODE];
    delete process.env[DEBUG];
    delete process.env[NAME];
    jest.restoreAllMocks();
  });

  it('returns a string when no onError is passed', () => {
    process.env[NAME] = 'app';

    expect(QuietEnvResolver.resolve(NAME)).toBe('app');
  });

  it('treats StrictEnvType.Number as a spec, not as an onError callback', () => {
    process.env[PORT] = '15';

    expect(QuietEnvResolver.resolve(PORT, StrictEnvType.Number)).toBe(15);
  });

  it('returns a parsed number when default is set and onError is on the options object', () => {
    delete process.env[PORT];

    const port = QuietEnvResolver.resolve(PORT, StrictEnvType.Number.Port, {
      default: 3000,
      onError,
    });

    expect(port).toBe(3000);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a validation failure through a trailing callback and returns undefined', () => {
    delete process.env[PORT];
    process.env[PORT] = 'nope';

    const port = QuietEnvResolver.resolve(PORT, StrictEnvType.Number.Port, onError);

    expect(port).toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);

    const error: unknown = onError.mock.calls[0][0];
    expect(error).toBeInstanceOf(QuietEnvResolverValidateError);
    expect(error).toBeInstanceOf(QuietEnvResolverError);
    expect(error).not.toBeInstanceOf(StrictEnvValidationError);

    if (!(error instanceof QuietEnvResolverValidateError)) {
      throw new Error('expected QuietEnvResolverValidateError');
    }

    expect(error.name).toBe('QuietEnvResolverValidateError');
    expect(error.message).toBe(SHAPE_MISMATCH);
    expect(error.message).not.toContain('nope');
  });

  it('accepts { onError } as the last argument', () => {
    delete process.env[PORT];

    const port = QuietEnvResolver.resolve(PORT, StrictEnvType.Number.Port, { default: 3000 }, {
      onError,
    });

    expect(port).toBe(3000);
    expect(onError).not.toHaveBeenCalled();
  });

  it('returns undefined and does not throw when onError is omitted', () => {
    delete process.env[PORT];

    expect(QuietEnvResolver.resolve(PORT, StrictEnvType.Number.Port)).toBeUndefined();
  });

  it('uses { onError } in place of strict options', () => {
    process.env[NAME] = 'app';

    const name = QuietEnvResolver.resolve(NAME, StrictEnvType.String, { onError });

    expect(name).toBe('app');
    expect(onError).not.toHaveBeenCalled();
  });

  it('uses default without calling onError when the callback was not passed', () => {
    delete process.env[PORT];

    const port = QuietEnvResolver.resolve(PORT, StrictEnvType.Number.Port, { default: 3000 });

    expect(port).toBe(3000);
    expect(onError).not.toHaveBeenCalled();
  });

  it('ignores a non-function onError and still returns undefined on failure', () => {
    delete process.env[PORT];

    const resolve = QuietEnvResolver.resolve as unknown as (
      key: string,
      spec: typeof StrictEnvType.Number.Port,
      options: { onError: string },
    ) => unknown;

    expect(resolve(PORT, StrictEnvType.Number.Port, { onError: 'nope' })).toBeUndefined();
  });

  it('passes a non-validation throw through onError', () => {
    const boom = new Error('boom');
    jest.spyOn(StrictEnvResolver, 'resolve').mockImplementation(() => {
      throw boom;
    });

    const value = QuietEnvResolver.resolve(NAME, onError);

    expect(value).toBeUndefined();
    expect(onError).toHaveBeenCalledWith(boom);
  });

  it('lets an onError throw escape the resolver', () => {
    delete process.env[PORT];

    expect(() => {
      QuietEnvResolver.resolve(PORT, StrictEnvType.Number.Port, () => {
        throw new Error('handler failed');
      });
    }).toThrow('handler failed');
  });

  it('returns every parsed value from resolves', () => {
    process.env[PORT] = '80';
    process.env[DEBUG] = 'yes';

    const envs = QuietEnvResolver.resolves({
      [PORT]: StrictEnvType.Number.Port,
      [DEBUG]: [StrictEnvType.Boolean, { default: false }],
    }, onError);

    expect(envs).toEqual({
      [PORT]: 80,
      [DEBUG]: true,
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a schema failure once through { onError } and does not include raw values', () => {
    delete process.env[PORT];
    process.env[MODE] = 'nope';

    const envs = QuietEnvResolver.resolves({
      [PORT]: StrictEnvType.Number.Port,
      [MODE]: StrictEnvType.Enum(['read', 'write'] as const),
    }, { onError });

    expect(envs).toBeUndefined();

    const error: unknown = onError.mock.calls[0][0];
    if (!(error instanceof QuietEnvResolverValidateError)) {
      throw new Error('expected QuietEnvResolverValidateError');
    }

    expect(error.message).toBe(SHAPE_MISMATCH);
    expect(error.message).not.toContain('nope');
    expect(error).not.toHaveProperty('errors');
    expect(error).not.toHaveProperty('keys');
  });

  it('returns undefined from resolves when onError is omitted', () => {
    delete process.env[NAME];

    expect(QuietEnvResolver.resolves({
      [NAME]: StrictEnvType.String,
    })).toBeUndefined();
  });
});