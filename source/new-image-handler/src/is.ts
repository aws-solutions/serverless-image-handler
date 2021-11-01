export function inRange(val: number, min: number, max: number): boolean {
  return val >= min && val <= max;
};

export function hexColor(c: string): boolean {
  const regex = /^#([\da-f]{3}){1,2}$|^#([\da-f]{4}){1,2}$/i;
  return !!(c && regex.test(c));
}


export function defined(val: any) {
  return typeof val !== 'undefined' && val !== null;
};


export function object(val: any) {
  return typeof val === 'object';
};


export function plainObject(val: any) {
  return Object.prototype.toString.call(val) === '[object Object]';
};


export function fn(val: any) {
  return typeof val === 'function';
};


export function bool(val: any) {
  return typeof val === 'boolean';
};


export function buffer(val: any) {
  return val instanceof Buffer;
};


export function typedArray(val: any) {
  if (defined(val)) {
    switch (val.constructor) {
      case Uint8Array:
      case Uint8ClampedArray:
      case Int8Array:
      case Uint16Array:
      case Int16Array:
      case Uint32Array:
      case Int32Array:
      case Float32Array:
      case Float64Array:
        return true;
    }
  }

  return false;
};


export function string(val: any) {
  return typeof val === 'string' && val.length > 0;
};


export function number(val: any) {
  return typeof val === 'number' && !Number.isNaN(val);
};


export function integer(val: any) {
  return Number.isInteger(val);
};

export function inArray(val: any, list: any[]) {
  return list.includes(val);
};