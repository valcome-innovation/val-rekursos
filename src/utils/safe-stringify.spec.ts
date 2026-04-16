import { safeStringify } from './safe-stringify';

describe('safeStringify', () => {

  it('should stringify safe', () => {
    const a: any = { a: 1 };
    const b: any = { b: 2 };
    a.b = b;
    b.b = a;

    const actual = safeStringify(a);

    expect(actual).toEqual('{"a":1,"b":{"b":"[Circular]"}}');
  });

  it('should serialize shared references (non-circular) fully', () => {
    const shared = { x: 1 };
    const obj = { a: shared, b: shared };

    const actual = safeStringify(obj);

    expect(actual).toEqual('{"a":{"x":1},"b":{"x":1}}');
  });

  it('should handle Buffer without OOM', () => {
    const buf = Buffer.alloc(1024 * 1024); // 1MB buffer
    const obj = { data: buf };

    const before = process.memoryUsage().heapUsed;
    const result = safeStringify(obj);
    const after = process.memoryUsage().heapUsed;

    const heapGrowthMB = (after - before) / 1024 / 1024;

    // should represent buffer as a placeholder, not serialize every byte
    expect(heapGrowthMB).toBeLessThan(50);
    expect(result).not.toContain('"1023"'); // should not have byte-index keys
  });

  it('should handle TypedArray without OOM', () => {
    const arr = new Uint8Array(1024 * 1024);
    const obj = { data: arr };

    const result = safeStringify(obj);

    expect(result).not.toContain('"1023"');
  });

  it('should handle empty Buffer', () => {
    const result = safeStringify({ data: Buffer.alloc(0) });
    expect(result).toBe('{"data":"[Buffer: 0 bytes]"}');
  });

  it('should handle ArrayBuffer', () => {
    const result = safeStringify({ data: new ArrayBuffer(1024) });
    expect(result).toBe('{"data":"[ArrayBuffer: 1024 bytes]"}');
  });

  it('should preserve normal data alongside Buffers', () => {
    const obj = {
      message: 'error',
      code: 403,
      data: Buffer.alloc(100),
      nested: { ok: true },
    };
    const parsed = JSON.parse(safeStringify(obj));
    expect(parsed.message).toBe('error');
    expect(parsed.code).toBe(403);
    expect(parsed.data).toBe('[Buffer: 100 bytes]');
    expect(parsed.nested).toEqual({ ok: true });
  });

  it('should handle null and undefined values', () => {
    const result = safeStringify({ a: null, b: undefined, c: 0, d: '' });
    expect(result).toBe('{"a":null,"c":0,"d":""}');
  });

  it('should handle arrays with mixed content', () => {
    const result = safeStringify([1, 'two', { three: 3 }, Buffer.alloc(8)]);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([1, 'two', { three: 3 }, '[Buffer: 8 bytes]']);
  });

  it('should handle nested Buffer inside error-like objects', () => {
    const buf = Buffer.alloc(1024 * 1024);
    const fakeAxiosError = {
      message: 'Request failed with status code 403',
      config: {
        data: {
          _readableState: {
            buffer: { head: { data: buf } }
          }
        }
      }
    };
    const obj = { msg: fakeAxiosError.message, original: fakeAxiosError };

    const before = process.memoryUsage().heapUsed;
    const result = safeStringify(obj);
    const after = process.memoryUsage().heapUsed;

    const heapGrowthMB = (after - before) / 1024 / 1024;
    expect(heapGrowthMB).toBeLessThan(50);

    const parsed = JSON.parse(result);
    expect(parsed.msg).toBe('Request failed with status code 403');
  });
});
