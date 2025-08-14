import fs from 'node:fs';

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
    const printlnNameIndex = this.addUtf8Constant("println");
    const printlnDescriptorIndex = this.addUtf8Constant("(C)V");
    // const printlnDescriptorIndex = this.addUtf8Constant("(Ljava/lang/String;)V");
    const printlnNameAndTypeIndex = this.addNameAndTypeConstant(printlnNameIndex, printlnDescriptorIndex);
    const printlnMethodrefIndex = this.addMethodrefConstant(printStreamClassIndex, printlnNameAndTypeIndex);

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

    const jvmInstructions = makeInstructions({ constantPool: this.constantPool, symbolicConstantPool });

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
    const CODE_ATTR_BASE_SIZE = 12;
    this.writeU2(codeNameIndex); // attribute_name_index
    this.writeU4(CODE_ATTR_BASE_SIZE + jvmInstructions.length); // attribute_length
    this.writeU2(4); // max_stack
    this.writeU2(3); // max_locals
    this.writeU4(jvmInstructions.length); // code_length
    this.writeBytes(jvmInstructions);
    this.writeU2(0); // exception_table_length
    this.writeU2(0); // attributes_count

    // Class attributes
    this.writeU2(0); // attributes_count

    return new Uint8Array(this.buffer);
  }

  static saveToFile(filename, classData) {
    fs.writeFileSync(filename, classData);
  }
}
