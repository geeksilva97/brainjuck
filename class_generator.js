import fs from 'node:fs';

// The base structure of this file was written by Claude - it was very useful. I could then focus on the implementation
// of the JVM instructions.
// of course, I had already understood the structure of the ClassFile format, while writing the read_jvm_bytecode.js
// file.
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

  // Generate a simple "Hello World" class
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
    const STACK_MAP_TABLE_ATTR_BASE_SIZE = 6; // u2 attribute_name_index + u4 attribute_length 
    this.writeU2(codeNameIndex); // attribute_name_index

    const stackMapTableAttrLength = this.getStackMapTableSize(stackMapTable);
    console.log('jvmisntructions.length', jvmInstructions.length, 'stackMapTableAttrLength', stackMapTableAttrLength, 'STACK_MAP_TABLE_ATTR_BASE_SIZE', STACK_MAP_TABLE_ATTR_BASE_SIZE);

    this.writeU4(CODE_ATTR_BASE_SIZE + jvmInstructions.length + stackMapTableAttrLength + STACK_MAP_TABLE_ATTR_BASE_SIZE); // attribute_length
    this.writeU2(4); // max_stack
    this.writeU2(3); // max_locals
    this.writeU4(jvmInstructions.length); // code_length
    this.writeBytes(jvmInstructions);
    this.writeU2(0); // exception_table_length

    const codeAttributesCount = stackMapTable.length > 0 ? 1 : 0;
    this.writeU2(codeAttributesCount); // attributes_count

    if (codeAttributesCount > 0) {
      this.writeStackMapTable({
        stackMapTable,
        stackMapTableConstantIndex,
        stackMapTableAttrLength
      });
    }

    // Class attributes
    this.writeU2(0); // attributes_count

    return new Uint8Array(this.buffer);
  }

  getStackMapTableSize(stackMapTable) {
    const STACK_MAP_TABLE_ATTR_BASE_SIZE = 2; // u2 number_of_entries
    let stackMapTableAttributeLength = STACK_MAP_TABLE_ATTR_BASE_SIZE;
    for (const entry of stackMapTable) {
      const frameType = entry.frameType || entry.offsetDelta;
      const isAppendFrame = frameType >= 252 && frameType <= 254;
      const isSameFrame = frameType >= 0 && frameType <= 63;
      const isSameFrameExtended = frameType === 251;

      if (isSameFrame) {
        // same frame
        stackMapTableAttributeLength += 1; // type of the stack map frame and offset delta are combined
      } else if (isAppendFrame || isSameFrameExtended) {
        // append frame
        // same frame extended
        stackMapTableAttributeLength += 3; // type of the stack map frame, offset delta, and additional information
      } else {
        throw new Error(`Invalid frame type: ${frameType}`);
      }


      if (entry.locals) {
        for (const local of entry.locals) {
          stackMapTableAttributeLength += 1; // local type
          if (local.type === 7) { // Object type
            stackMapTableAttributeLength += 2; // constant pool index for object type
          }
        }
      }
    }

    return stackMapTableAttributeLength;
  }

  writeStackMapTable({
    stackMapTable,
    stackMapTableConstantIndex,
    stackMapTableAttrLength
  }) {
    console.log('Writing StackMapTable', { stackMapTable, stackMapTableConstantIndex, stackMapTableAttrLength });

    this.writeU2(stackMapTableConstantIndex); // attribute_name_index
    this.writeU4(stackMapTableAttrLength); // StackMapTable attribute length
    this.writeU2(stackMapTable.length); // number of entries in StackMapTable

    for (const entry of stackMapTable) {
      const frameType = entry.frameType || entry.offsetDelta;
      const isAppendFrame = frameType >= 252 && frameType <= 254;
      const isSameFrame = frameType >= 0 && frameType <= 63;
      const isSameFrameExtended = frameType === 251;

      if ([isSameFrame, isSameFrameExtended, isAppendFrame].every(v => !v)) {
        throw new Error(`Invalid frame type: ${frameType}`);
      }

      console.log('Writing StackMapTable entry', { frameType, isAppendFrame, isSameFrameExtended });
      this.writeU1(frameType); // frame type

      if (isAppendFrame || isSameFrameExtended) {
        this.writeU2(entry.offsetDelta); // offset delta

        if (isAppendFrame && entry.locals) {
          for (const local of entry.locals) {
            this.writeU1(local.type); // write local type

            if (local.type === 7) { // Object type
              this.writeU2(local.cpoolIndex); // write constant pool index for object type
            }
          }
        }
      }
    }
  }

  static saveToFile(filename, classData) {
    fs.writeFileSync(filename, classData);
  }
}
