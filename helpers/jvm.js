export const OPCODES = {
  astore_1: 0x4c,
  iconst_0: 0x03,
  istore_2: 0x3d,
  newarray: 0xbc,
  sipush: 0x11,
  return: 0xb1
};

export const ARRAY_TYPE = {
  T_BOOLEAN: 4,
  T_CHAR: 5,
  T_FLOAT: 6,
  T_DOUBLE: 7,
  T_BYTE: 8,
  T_SHORT: 9,
  T_INT: 10,
  T_LONG: 11,
};

export function intTo2Bytes(num) {
  return [(num >> 8) & 0xFF, num & 0xFF];
}

export function sipush(n) {
  return Buffer.from([0x11, ...intTo2Bytes(n)])
}

export function newarray(type) {
  return Buffer.from([OPCODES.newarray, type])
}

export function astore_1() {
  return Buffer.from([OPCODES.astore_1])
}

export function iconst_0() {
  return Buffer.from([OPCODES.iconst_0])
}

export function istore_2() {
  return Buffer.from([OPCODES.istore_2])
}

export const move_head = (h) => {
  return []
    .concat([0x11, ...intTo2Bytes(h)]) // sipush h
    .concat([0x3d]) // istore_2 (storing in head)
    ;
};

export const increment = (n) => {
  return []
    .concat([0x2b]) // aload_1
    .concat([0x1c]) // iload_2
    .concat([0x5c]) // dup2
    .concat([0x33]) // baload
    .concat([0x11, ...intTo2Bytes(n)]) // sipush n
    .concat([0x60]) // iadd
    .concat([0x91]) // i2b
    .concat([0x54]) // bastore
    ;
};

export const input = ({ fieldRef, methodRef }) => {
  const getStatic = [0xb2, ...intTo2Bytes(fieldRef)];
  const invokeVirtual = [0xb6, ...intTo2Bytes(methodRef)];
  return [
    ...getStatic,
    ...invokeVirtual,
    0x2b, // aload_1 (load arrayref)
    0x5f, // swap
    0x1c, // iload_2 (load index)
    0x5f, // swap
    0x54, // bastore
  ]
};

export const output = ({ fieldRef, methodRef }) => {
  const getStatic = [0xb2, ...intTo2Bytes(fieldRef)];
  const invokeVirtual = [0xb6, ...intTo2Bytes(methodRef)];
  return [
    ...getStatic,
    ...[
      0x2b, // aload_1
      0x1c, // iload_2
      0x33, // baload (get value at index -> cell[head])
      0x92, // i2c
    ],
    ...invokeVirtual
  ]
};
