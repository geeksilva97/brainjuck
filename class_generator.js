import fs from 'node:fs';

// The base structure of this file was written by Claude - it was very useful. I could then focus on the implementation
// of the JVM instructions.
// of course, I had already understood the structure of the ClassFile format, while writing the read_jvm_bytecode.js
// file.
//

function readVerificationTypeInfo(bytes, offset) {
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

function getFrameTypeDescription(frameType) {
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

function parseStackMapTable(input) {
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

export class ClassFileGenerator {
  constructor() {
    this.buffer = [];
    this.constantPool = [];
    this.constantPoolMap = new Map(); // For deduplication
  }

  // Write unsigned integers of different sizes
  writeU1(value) {
    this.buffer.push(value & 0xFF);
  }

  writeU2(value) {
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push(value & 0xFF);
  }

  writeU4(value) {
    this.buffer.push((value >> 24) & 0xFF);
    this.buffer.push((value >> 16) & 0xFF);
    this.buffer.push((value >> 8) & 0xFF);
    this.buffer.push(value & 0xFF);
  }

  writeBytes(bytes) {
    this.buffer.push(...bytes);
  }

  // Constant pool management
  addUtf8Constant(str) {
    const key = `utf8:${str}`;
    if (this.constantPoolMap.has(key)) {
      return this.constantPoolMap.get(key);
    }

    const bytes = new TextEncoder().encode(str);
    const index = this.constantPool.length + 1;

    this.constantPool.push({
      tag: 1, // CONSTANT_Utf8
      length: bytes.length,
      bytes: bytes
    });

    this.constantPoolMap.set(key, index);
    return index;
  }

  addClassConstant(nameIndex) {
    const key = `class:${nameIndex}`;
    if (this.constantPoolMap.has(key)) {
      return this.constantPoolMap.get(key);
    }

    const index = this.constantPool.length + 1;
    this.constantPool.push({
      tag: 7, // CONSTANT_Class
      nameIndex: nameIndex
    });

    this.constantPoolMap.set(key, index);
    return index;
  }

  addNameAndTypeConstant(nameIndex, descriptorIndex) {
    const key = `nameandtype:${nameIndex}:${descriptorIndex}`;
    if (this.constantPoolMap.has(key)) {
      return this.constantPoolMap.get(key);
    }

    const index = this.constantPool.length + 1;
    this.constantPool.push({
      tag: 12, // CONSTANT_NameAndType
      nameIndex: nameIndex,
      descriptorIndex: descriptorIndex
    });

    this.constantPoolMap.set(key, index);
    return index;
  }

  addMethodrefConstant(classIndex, nameAndTypeIndex) {
    const key = `methodref:${classIndex}:${nameAndTypeIndex}`;
    if (this.constantPoolMap.has(key)) {
      return this.constantPoolMap.get(key);
    }

    const index = this.constantPool.length + 1;
    this.constantPool.push({
      tag: 10, // CONSTANT_Methodref
      classIndex: classIndex,
      nameAndTypeIndex: nameAndTypeIndex
    });

    this.constantPoolMap.set(key, index);
    return index;
  }

  addStringConstant(stringIndex) {
    const key = `string:${stringIndex}`;
    if (this.constantPoolMap.has(key)) {
      return this.constantPoolMap.get(key);
    }

    const index = this.constantPool.length + 1;
    this.constantPool.push({
      tag: 8, // CONSTANT_String
      stringIndex: stringIndex
    });

    this.constantPoolMap.set(key, index);
    return index;
  }

  addFieldrefConstant(classIndex, nameAndTypeIndex) {
    const key = `fieldref:${classIndex}:${nameAndTypeIndex}`;
    if (this.constantPoolMap.has(key)) {
      return this.constantPoolMap.get(key);
    }

    const index = this.constantPool.length + 1;
    this.constantPool.push({
      tag: 9, // CONSTANT_Fieldref
      classIndex: classIndex,
      nameAndTypeIndex: nameAndTypeIndex
    });

    this.constantPoolMap.set(key, index);
    return index;
  }

  // Write constant pool to buffer
  writeConstantPool() {
    this.writeU2(this.constantPool.length + 1); // constant_pool_count

    for (const constant of this.constantPool) {
      this.writeU1(constant.tag);

      switch (constant.tag) {
        case 1: // CONSTANT_Utf8
          this.writeU2(constant.length);
          this.writeBytes(Array.from(constant.bytes));
          break;
        case 7: // CONSTANT_Class
          this.writeU2(constant.nameIndex);
          break;
        case 8: // CONSTANT_String
          this.writeU2(constant.stringIndex);
          break;
        case 9: // CONSTANT_Fieldref
        case 10: // CONSTANT_Methodref
          this.writeU2(constant.classIndex);
          this.writeU2(constant.nameAndTypeIndex);
          break;
        case 12: // CONSTANT_NameAndType
          this.writeU2(constant.nameIndex);
          this.writeU2(constant.descriptorIndex);
          break;
      }
    }
  }

  generateHelloWorldClass(className = 'HelloWorld', makeInstructions = () => []) {
    // Reset buffer and constants
    this.buffer = [];
    this.constantPool = [];
    this.constantPoolMap.clear();

    // Add required constants
    const objectClassNameIndex = this.addUtf8Constant("java/lang/Object");
    const objectClassIndex = this.addClassConstant(objectClassNameIndex);

    const helloWorldClassNameIndex = this.addUtf8Constant(className);
    const helloWorldClassIndex = this.addClassConstant(helloWorldClassNameIndex);

    const systemClassNameIndex = this.addUtf8Constant("java/lang/System");
    const systemClassIndex = this.addClassConstant(systemClassNameIndex);

    const helloStringIndex = this.addUtf8Constant("Hello, World!");
    const helloStringConstantIndex = this.addStringConstant(helloStringIndex);

    const printStreamClassNameIndex = this.addUtf8Constant("java/io/PrintStream");
    const printStreamClassIndex = this.addClassConstant(printStreamClassNameIndex);
    const outFieldNameIndex = this.addUtf8Constant("out");
    const printStreamDescriptorIndex = this.addUtf8Constant("Ljava/io/PrintStream;");
    const outNameAndTypeIndex = this.addNameAndTypeConstant(outFieldNameIndex, printStreamDescriptorIndex);
    const outFieldrefIndex = this.addFieldrefConstant(systemClassIndex, outNameAndTypeIndex);
    const printlnNameIndex = this.addUtf8Constant("print");
    const printlnDescriptorIndex = this.addUtf8Constant("(C)V");

    const printlnNameAndTypeIndex = this.addNameAndTypeConstant(printlnNameIndex, printlnDescriptorIndex);
    const printlnMethodrefIndex = this.addMethodrefConstant(printStreamClassIndex, printlnNameAndTypeIndex);

    // StackMapTable (for Java 8 compatibility)

    const stackMapTableConstantIndex = this.addUtf8Constant("StackMapTable");
    const cellsDescriptorIndex = this.addUtf8Constant("[B");
    this.addClassConstant(cellsDescriptorIndex)

    // end of StackMapTable

    // INPUT

    const inputStreamClassNameIndex = this.addUtf8Constant("java/io/InputStream");
    const inputStreamClassIndex = this.addClassConstant(inputStreamClassNameIndex);
    const inFieldNameIndex = this.addUtf8Constant("in");
    const inputStreamDescriptorIndex = this.addUtf8Constant("Ljava/io/InputStream;");
    const inNameAndTypeIndex = this.addNameAndTypeConstant(inFieldNameIndex, inputStreamDescriptorIndex);
    const inFieldrefIndex = this.addFieldrefConstant(systemClassIndex, inNameAndTypeIndex);
    const readNameIndex = this.addUtf8Constant("read");
    const readDescriptorIndex = this.addUtf8Constant("()I");
    const readNameAndTypeIndex = this.addNameAndTypeConstant(readNameIndex, readDescriptorIndex);
    const readMethodrefIndex = this.addMethodrefConstant(inputStreamClassIndex, readNameAndTypeIndex);

    // INPUT

    const mainNameIndex = this.addUtf8Constant("main");
    const mainDescriptorIndex = this.addUtf8Constant("([Ljava/lang/String;)V");

    const codeNameIndex = this.addUtf8Constant("Code");
    const constructorNameIndex = this.addUtf8Constant("<init>");
    const constructorDescriptorIndex = this.addUtf8Constant("()V");
    const constructorNameAndTypeIndex = this.addNameAndTypeConstant(constructorNameIndex, constructorDescriptorIndex);
    const constructorMethodrefIndex = this.addMethodrefConstant(objectClassIndex, constructorNameAndTypeIndex);

    const symbolicConstantPool = {
      output: {
        fieldRef: outFieldrefIndex,
        printlnDescriptorIndex,
        printlnNameAndTypeIndex,
        printlnMethodrefIndex
      },
      input: {
        classNameIndex: inputStreamClassNameIndex,
        classIndex: inputStreamClassIndex,
        fieldNameIndex: inFieldNameIndex,
        descriptorIndex: inputStreamDescriptorIndex,
        nameAndTypeIndex: inNameAndTypeIndex,
        fieldRef: inFieldrefIndex,
        readNameIndex,
        readDescriptorIndex,
        readNameAndTypeIndex,
        readMethodrefIndex
      }
    };

    const { code: jvmInstructions, stackMapTable } = makeInstructions({ constantPool: this.constantPool, symbolicConstantPool });

    // Write ClassFile structure

    // Magic number
    this.writeU4(0xCAFEBABE);

    // Version (Java 8 = 52.0)
    this.writeU2(0); // minor_version
    this.writeU2(52); // major_version

    // Constant pool
    this.writeConstantPool();

    // Access flags (public)
    this.writeU2(0x0021); // ACC_PUBLIC | ACC_SUPER

    // This class
    this.writeU2(helloWorldClassIndex);

    // Super class
    this.writeU2(objectClassIndex);

    // Interfaces
    this.writeU2(0); // interfaces_count

    // Fields
    this.writeU2(0); // fields_count

    // Methods (constructor + main)
    this.writeU2(2); // methods_count

    // Constructor method
    this.writeU2(0x0001); // ACC_PUBLIC
    this.writeU2(constructorNameIndex); // name_index
    this.writeU2(constructorDescriptorIndex); // descriptor_index
    this.writeU2(1); // attributes_count

    // Constructor Code attribute
    this.writeU2(codeNameIndex); // attribute_name_index
    this.writeU4(17); // attribute_length
    this.writeU2(1); // max_stack
    this.writeU2(1); // max_locals
    this.writeU4(5); // code_length
    // Constructor bytecode: aload_0, invokespecial Object.<init>, return
    this.writeU1(0x2A); // aload_0
    this.writeU1(0xB7); // invokespecial
    this.writeU2(constructorMethodrefIndex);
    this.writeU1(0xB1); // return
    this.writeU2(0); // exception_table_length
    this.writeU2(0); // attributes_count

    // Main method
    this.writeU2(0x0009); // ACC_PUBLIC | ACC_STATIC
    this.writeU2(mainNameIndex); // name_index
    this.writeU2(mainDescriptorIndex); // descriptor_index
    this.writeU2(1); // attributes_count

    // Main Code attribute
    // Code attribute base size is 12 (u2 + u2 + u4 + u2 + u2)
    // without the code
    // u2 max_stack
    // u2 max_locals
    // u4 code_length
    // u2 exception_table_length
    // u2 attributes_count
    const CODE_ATTR_BASE_SIZE = 12;
    // const STACK_MAP_TABLE_ATTR_BASE_SIZE = 6; // u2 attribute_name_index + u4 attribute_length 
    this.writeU2(codeNameIndex); // attribute_name_index

    const computedStackMapTable = this.computeStackMapTable({
      stackMapTable,
      stackMapTableConstantIndex
    });

    console.log('debugging stackmaptable');
    parseStackMapTable(computedStackMapTable);
    console.log('end debugging stackmaptable');

    this.writeU4(CODE_ATTR_BASE_SIZE + jvmInstructions.length + computedStackMapTable.length); // attribute_length
    this.writeU2(4); // max_stack
    this.writeU2(3); // max_locals
    this.writeU4(jvmInstructions.length); // code_length
    this.writeBytes(jvmInstructions);
    this.writeU2(0); // exception_table_length

    const codeAttributesCount = stackMapTable.length > 0 ? 1 : 0;
    this.writeU2(codeAttributesCount); // attributes_count

    if (codeAttributesCount > 0) {
      this.writeBytes(computedStackMapTable);
    }

    // Class attributes
    this.writeU2(0); // attributes_count

    return new Uint8Array(this.buffer);
  }

  computeStackMapTable({
    stackMapTable,
    stackMapTableConstantIndex,
  }) {
    const gen = new ClassFileGenerator();
    gen.writeU2(stackMapTableConstantIndex); // attribute_name_index

    const entriesBuf = new ClassFileGenerator();
    for (const entry of stackMapTable) {
      let entrySize = 0;
      const frameType = entry.frameType || entry.offsetDelta;
      const frameTypeDescription = getFrameTypeDescription(frameType);
      const isAppendFrame = frameType >= 252 && frameType <= 254;
      const isSameFrame = frameType >= 0 && frameType <= 63;
      const isSameFrameExtended = frameType === 251;

      if ([isSameFrame, isSameFrameExtended, isAppendFrame].every(v => !v)) {
        throw new Error(`Invalid frame type: ${frameType}`);
      }

      console.log('writing entry type', frameType, `(${frameTypeDescription})`);
      entriesBuf.writeU1(frameType); // frame type
      entrySize += 1;

      if (isAppendFrame || isSameFrameExtended) {
        console.log(`\twriting offset delta (${entry.offsetDelta}) for ${frameTypeDescription}`);
        entriesBuf.writeU2(entry.offsetDelta); // offset delta
        entrySize += 2;
      }

      if (entry.locals) {
        console.log(`\twriting locals for ${frameTypeDescription}`);
        for (const local of entry.locals) {
          console.log(`\t\twriting local (${local.type})`);
          entriesBuf.writeU1(local.type); // write local type
          entrySize += 1;

          if (local.type === 7) { // Object type
            console.log(`\t\twriting cpoolindex for object (${local.cpoolIndex})`);
            entriesBuf.writeU2(local.cpoolIndex); // write constant pool index for object type
            entrySize += 2;
          }
        }
      }

      console.log('ENTRY SIZE', entrySize)

      console.log()
    }

    const numberEntries = stackMapTable.length;
    console.log({ numberEntries, entriesLength: entriesBuf.buffer.length });

    // 2 is the size of number_of_entries (u2)
    gen.writeU4(2 + entriesBuf.buffer.length); // attribute_length
    gen.writeU2(numberEntries); // number of entries in StackMapTable
    gen.writeBytes(entriesBuf.buffer);

    console.log('StackMapTable attribute length', 2 + entriesBuf.buffer.length);

    console.log('Computing StackMapTable', { stackMapTable, buf: Buffer.from(gen.buffer), bufLen: gen.buffer.length });
    return gen.buffer;
  }

  static saveToFile(filename, classData) {
    fs.writeFileSync(filename, classData);
  }
}
