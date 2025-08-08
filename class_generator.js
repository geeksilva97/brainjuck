import fs from 'node:fs';

class ClassFileGenerator {
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
  generateHelloWorldClass(className = 'HelloWorld') {
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

    const printStreamClassNameIndex = this.addUtf8Constant("java/io/PrintStream");
    const printStreamClassIndex = this.addClassConstant(printStreamClassNameIndex);

    const outFieldNameIndex = this.addUtf8Constant("out");
    const printStreamDescriptorIndex = this.addUtf8Constant("Ljava/io/PrintStream;");
    const outNameAndTypeIndex = this.addNameAndTypeConstant(outFieldNameIndex, printStreamDescriptorIndex);
    const outFieldrefIndex = this.addFieldrefConstant(systemClassIndex, outNameAndTypeIndex);

    const printlnNameIndex = this.addUtf8Constant("println");
    const printlnDescriptorIndex = this.addUtf8Constant("(Ljava/lang/String;)V");
    const printlnNameAndTypeIndex = this.addNameAndTypeConstant(printlnNameIndex, printlnDescriptorIndex);
    const printlnMethodrefIndex = this.addMethodrefConstant(printStreamClassIndex, printlnNameAndTypeIndex);

    const helloStringIndex = this.addUtf8Constant("Hello, World!");
    const helloStringConstantIndex = this.addStringConstant(helloStringIndex);

    const mainNameIndex = this.addUtf8Constant("main");
    const mainDescriptorIndex = this.addUtf8Constant("([Ljava/lang/String;)V");

    const codeNameIndex = this.addUtf8Constant("Code");
    const constructorNameIndex = this.addUtf8Constant("<init>");
    const constructorDescriptorIndex = this.addUtf8Constant("()V");
    const constructorNameAndTypeIndex = this.addNameAndTypeConstant(constructorNameIndex, constructorDescriptorIndex);
    const constructorMethodrefIndex = this.addMethodrefConstant(objectClassIndex, constructorNameAndTypeIndex);

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
    this.writeU2(codeNameIndex); // attribute_name_index
    this.writeU4(21); // attribute_length
    this.writeU2(2); // max_stack
    this.writeU2(1); // max_locals
    this.writeU4(9); // code_length
    // Main bytecode: getstatic System.out, ldc "Hello, World!", invokevirtual println, return
    this.writeU1(0xB2); // getstatic
    this.writeU2(outFieldrefIndex);
    this.writeU1(0x12); // ldc
    this.writeU1(helloStringConstantIndex);
    this.writeU1(0xB6); // invokevirtual
    this.writeU2(printlnMethodrefIndex);
    this.writeU1(0xB1); // return
    this.writeU2(0); // exception_table_length
    this.writeU2(0); // attributes_count

    // Class attributes
    this.writeU2(0); // attributes_count

    return new Uint8Array(this.buffer);
  }

  // Generate a minimal empty class
  generateEmptyClass(className = "EmptyClass") {
    this.buffer = [];
    this.constantPool = [];
    this.constantPoolMap.clear();

    // Add required constants for minimal class
    const objectClassNameIndex = this.addUtf8Constant("java/lang/Object");
    const objectClassIndex = this.addClassConstant(objectClassNameIndex);

    const classNameIndex = this.addUtf8Constant(className);
    const thisClassIndex = this.addClassConstant(classNameIndex);

    // Write ClassFile structure
    this.writeU4(0xCAFEBABE); // magic
    this.writeU2(0); // minor_version
    this.writeU2(52); // major_version (Java 8)

    this.writeConstantPool();

    this.writeU2(0x0021); // access_flags (ACC_PUBLIC | ACC_SUPER)
    this.writeU2(thisClassIndex); // this_class
    this.writeU2(objectClassIndex); // super_class
    this.writeU2(0); // interfaces_count
    this.writeU2(0); // fields_count
    this.writeU2(0); // methods_count
    this.writeU2(0); // attributes_count

    return new Uint8Array(this.buffer);
  }

  // Utility method to save class file (for Node.js environments)
  saveToFile(classData, filename) {
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      fs.writeFileSync(filename, classData);
      console.log(`Class file saved as ${filename}`);
    } else {
      console.log('File saving not available in browser environment');
      console.log('Class data:', Array.from(classData).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    }
  }
}

const className = process.argv[2] || 'HelloWorld';
// Example usage
const generator = new ClassFileGenerator();

// Generate HelloWorld.class
const helloWorldClass = generator.generateHelloWorldClass(className);
console.log(`${className}.class generated:`, helloWorldClass.length, 'bytes');

fs.writeFileSync(`${className}.class`, helloWorldClass);

// Generate EmptyClass.class
// const emptyClass = generator.generateEmptyClass("MyEmptyClass");
// console.log('MyEmptyClass.class generated:', emptyClass.length, 'bytes');

// Display first 32 bytes in hex for verification
console.log(`${className}.class header (hex):`);
console.log(Array.from(helloWorldClass.slice(0, 32))
  .map(b => '0x' + b.toString(16).padStart(2, '0'))
  .join(' '));

// Uncomment to save files (Node.js only)
// generator.saveToFile(helloWorldClass, 'HelloWorld.class');
// generator.saveToFile(emptyClass, 'MyEmptyClass.class');
