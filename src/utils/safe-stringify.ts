export function safeStringify(object: any) {
  const seen = new WeakSet();

  const replacer = (key: string, value: any): any => {
    if (!(value !== null && typeof value === 'object')) {
      return value;
    }

    if (ArrayBuffer.isView(value)) {
      return `[${value.constructor.name}: ${value.byteLength} bytes]`;
    }

    if (value instanceof ArrayBuffer || value instanceof SharedArrayBuffer) {
      return `[${value.constructor.name}: ${value.byteLength} bytes]`;
    }

    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    const newValue: any = Array.isArray(value) ? [] : {};

    for (const [key2, value2] of Object.entries(value)) {
      newValue[key2] = replacer(key2, value2);
    }

    seen.delete(value);

    return newValue;
  };

  return JSON.stringify(object, replacer);
}
