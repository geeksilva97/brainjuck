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

export const jump_eqz = (pc) => {
  return [
    0x2b, // aload_1
    0x1c, // iload_2
    0x33, // baload (get value at index -> cell[head])
    ...[0x99, ...intTo2Bytes(pc)] // ifeq pc (go to "pc" if current stack value is zero)
  ]
};

export const jump_neqz = (pc) => {
  return [
    0x2b, // aload_1
    0x1c, // iload_2
    0x33, // baload (get value at index -> cell[head])
    ...[0x9a, ...intTo2Bytes(pc)] // ifeq pc (go to "pc" if current stack value is zero)
  ]
};

export function getFrameTypeDescription(frameType) {
  if (frameType >= 0 && frameType <= 63) {
    return `SameFrame (${frameType})`;
  } else if (frameType === 64) {
    return 'SameLocals1StackItemFrame';
  } else if (frameType === 65) {
    return 'SameLocals1StackItemFrameExtended';
  } else if (frameType >= 67 && frameType <= 70) {
    return `SameLocals${frameType - 64}StackItemFrame`;
  } else if (frameType === 247) {
    return 'SameLocals1StackItemFrameExtended';
  } else if (frameType >= 248 && frameType <= 250) {
    return `ChopFrame (${frameType - 251})`;
  } else if (frameType === 251) {
    return 'SameFrameExtended';
  } else if (frameType >= 252 && frameType <= 254) {
    return `AppendFrame (${frameType - 251})`;
  } else if (frameType === 255) {
    return 'FullFrame';
  } else {
    return `Unknown Frame Type (${frameType})`;
  }
}

export const readVerificationTypeInfo = (bytes, offset) => {
  const tag = bytes.readUInt8(offset);
  let newOffset = offset + 1;
  let description = '';

  switch (tag) {
    case 0:
      description = 'Top_variable_info';
      break;
    case 1:
      description = 'Integer_variable_info';
      break;
    case 2:
      description = 'Float_variable_info';
      break;
    case 3:
      description = 'Double_variable_info';
      break;
    case 4:
      description = 'Long_variable_info';
      break;
    case 5:
      description = 'Null_variable_info';
      break;
    case 6:
      description = 'UninitializedThis_variable_info';
      break;
    case 7:
      const cpoolIndex = bytes.readUInt16BE(newOffset);
      newOffset += 2;
      description = `Object_variable_info (cpool_index: ${cpoolIndex})`;
      break;
    case 8:
      const offsetValue = bytes.readUInt16BE(newOffset);
      newOffset += 2;
      description = `Uninitialized_variable_info (offset: ${offsetValue})`;
      break;
    default:
      description = `Unknown_variable_info (tag: ${tag})`;
  }

  return { newOffset, description, tag };
}

export const parseStackMapTable = (input) => {
  let bytes;

  // Handle different input types
  if (Buffer.isBuffer(input)) {
    bytes = input;
  } else if (typeof input === 'string') {
    // Remove spaces and convert hex string to buffer
    const hexString = input.replace(/\s+/g, '');
    bytes = Buffer.from(hexString, 'hex');
  } else if (Array.isArray(input)) {
    bytes = Buffer.from(input);
  } else {
    throw new Error('Input must be a Buffer, hex string, or byte array');
  }

  let offset = 0;

  console.log('=== StackMapTable Parsing ===');
  console.log('Input type:', Buffer.isBuffer(input) ? 'Buffer' : typeof input);
  console.log('Buffer length:', bytes.length, 'bytes');
  console.log('Hex representation:', bytes.toString('hex').match(/.{2}/g).join(' '));
  console.log('');

  // Read attribute_name_index
  const attributeNameIndex = bytes.readUInt16BE(offset);
  offset += 2;
  console.log(`attribute_name_index: ${attributeNameIndex} (0x${attributeNameIndex.toString(16).padStart(4, '0')})`);

  // Read attribute_length
  const attributeLength = bytes.readUInt32BE(offset);
  offset += 4;
  console.log(`attribute_length: ${attributeLength} bytes`);

  // Read number_of_entries
  const numberOfEntries = bytes.readUInt16BE(offset);
  offset += 2;
  console.log(`number_of_entries: ${numberOfEntries}`);
  console.log('');

  // Parse each frame
  for (let i = 0; i < numberOfEntries; i++) {
    console.log(`--- Frame ${i} ---`);

    const frameType = bytes.readUInt8(offset);
    offset += 1;
    console.log(`frame_type: ${frameType} (0x${frameType.toString(16).padStart(2, '0')}) = ${getFrameTypeDescription(frameType)}`);

    if (frameType >= 0 && frameType <= 63) {
      // SameFrame - offset_delta is implicit in frame_type
      console.log(`  offset_delta: ${frameType} (implicit)`);

    } else if (frameType === 64) {
      // SameLocals1StackItemFrame
      console.log('  Reading stack verification type info...');
      const stackInfo = readVerificationTypeInfo(bytes, offset);
      offset = stackInfo.newOffset;
      console.log(`  stack[0]: ${stackInfo.description}`);

    } else if (frameType === 247) {
      // SameLocals1StackItemFrameExtended
      const offsetDelta = bytes.readUInt16BE(offset);
      offset += 2;
      console.log(`  offset_delta: ${offsetDelta}`);

      console.log('  Reading stack verification type info...');
      const stackInfo = readVerificationTypeInfo(bytes, offset);
      offset = stackInfo.newOffset;
      console.log(`  stack[0]: ${stackInfo.description}`);

    } else if (frameType >= 248 && frameType <= 250) {
      // ChopFrame
      const offsetDelta = bytes.readUInt16BE(offset);
      offset += 2;
      const chopCount = 251 - frameType;
      console.log(`  offset_delta: ${offsetDelta}`);
      console.log(`  chopping ${chopCount} locals`);

    } else if (frameType === 251) {
      // SameFrameExtended
      const offsetDelta = bytes.readUInt16BE(offset);
      offset += 2;
      console.log(`  offset_delta: ${offsetDelta}`);

    } else if (frameType >= 252 && frameType <= 254) {
      // AppendFrame
      const offsetDelta = bytes.readUInt16BE(offset);
      offset += 2;
      const appendCount = frameType - 251;
      console.log(`  offset_delta: ${offsetDelta}`);
      console.log(`  appending ${appendCount} locals:`);

      for (let j = 0; j < appendCount; j++) {
        const localInfo = readVerificationTypeInfo(bytes, offset);
        offset = localInfo.newOffset;
        console.log(`    locals[${j}]: ${localInfo.description}`);
      }

    } else if (frameType === 255) {
      // FullFrame
      const offsetDelta = bytes.readUInt16BE(offset);
      offset += 2;
      console.log(`  offset_delta: ${offsetDelta}`);

      const numberOfLocals = bytes.readUInt16BE(offset);
      offset += 2;
      console.log(`  number_of_locals: ${numberOfLocals}`);

      for (let j = 0; j < numberOfLocals; j++) {
        const localInfo = readVerificationTypeInfo(bytes, offset);
        offset = localInfo.newOffset;
        console.log(`    locals[${j}]: ${localInfo.description}`);
      }

      const numberOfStackItems = bytes.readUInt16BE(offset);
      offset += 2;
      console.log(`  number_of_stack_items: ${numberOfStackItems}`);

      for (let j = 0; j < numberOfStackItems; j++) {
        const stackInfo = readVerificationTypeInfo(bytes, offset);
        offset = stackInfo.newOffset;
        console.log(`    stack[${j}]: ${stackInfo.description}`);
      }
    }

    console.log('');
  }

  console.log(`Parsed ${offset} bytes total`);

  return { attributeNameIndex, attributeLength, numberOfEntries, bytesRead: offset };
}
