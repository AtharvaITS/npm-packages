import { afterEach, describe, expect, it, vi } from 'vitest';
import { warn } from '../../src/dev/warn';

describe('warn', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('prints each message once per instance, with the package prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = {};
    const second = {};
    warn(first, 'alpha-once');
    warn(first, 'alpha-once');
    warn(first, 'alpha-again');
    warn(second, 'alpha-once');
    expect(spy.mock.calls.map((call) => call[0])).toEqual([
      '[ReactDataGrid] alpha-once',
      '[ReactDataGrid] alpha-again',
      '[ReactDataGrid] alpha-once',
    ]);
  });

  it('shares one bucket when no instance key is given', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warn(undefined, 'global-bucket-message');
    warn(undefined, 'global-bucket-message');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does nothing in production, then warns again in development', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const key = {};
    vi.stubEnv('NODE_ENV', 'production');
    warn(key, 'after-prod');
    expect(spy).not.toHaveBeenCalled();
    vi.stubEnv('NODE_ENV', 'test');
    warn(key, 'after-prod');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
