import fs, { openSync } from 'node:fs';

// instructions
// https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-6.html#jvms-6.5

function BufferReader(buffer) {
  this.buffer = buffer;
  this.position = 0;
}

BufferReader.prototype.read = function(size = 1) {
  const buffer = this.buffer.slice(this.position, this.position + size);

  if (buffer.length === 0) {
    throw new Error('EOF');
  }

  this.position += size;

  return buffer;
}

function ByteReader(fd) {
  this.fd = fd;
  this.position = 0;
}

ByteReader.prototype.read = function(size = 1) {
  const buffer = Buffer.alloc(size);
  const bytesRead = fs.readSync(this.fd, buffer, 0, size, this.position);

  if (bytesRead === 0) {
    throw new Error('EOF');
  }

  this.position += bytesRead;

  return buffer;
};

const TAGS = {
  7: ['CONSTANT_Class', 7],
  9: ['CONSTANT_Fieldref', 9],
  10: ['CONSTANT_Methodref', 10],
  11: ['CONSTANT_InterfaceMethodref', 11],
  8: ['CONSTANT_String', 8],
  3: ['CONSTANT_Integer', 3],
  4: ['CONSTANT_Float', 4],
  5: ['CONSTANT_Long', 5],
  6: ['CONSTANT_Double', 6],
  12: ['CONSTANT_NameAndType', 12],
  1: ['CONSTANT_Utf8', 1],
  15: ['CONSTANT_MethodHandle', 15],
  16: ['CONSTANT_MethodType', 16],
  18: ['CONSTANT_InvokeDynamic', 18],
};

function bufferToInt(buffer) {
  return parseInt(buffer.toString('hex'), 16);
}

const fd = fs.openSync('./Brainfuck.class', 'r');
const reader = new ByteReader(fd);

const magic = reader.read(4);
const minor = reader.read(2);
const major = reader.read(2);
const constantPoolCount = bufferToInt(reader.read(2));

const constantPool = [];

for (let i = 1; i <= constantPoolCount - 1; ++i) {
  const tag = bufferToInt(reader.read(1));
  const [tagName] = TAGS[tag];

  switch (tagName) {
    case 'CONSTANT_Integer':
      {
        const bytes = reader.read(4);

        constantPool.push({ tagName, bytes });
      }
      break;
    case 'CONSTANT_String':
      {
        const stringIndex = bufferToInt(reader.read(2));

        constantPool.push({ tagName, stringIndex });
      }
      break;
    case 'CONSTANT_Fieldref':
      {
        const classIndex = bufferToInt(reader.read(2));
        const nameAndTypeIndex = bufferToInt(reader.read(2));

        constantPool.push({ tagName, classIndex, nameAndTypeIndex });
      }
      break;
    case 'CONSTANT_Utf8':
      {
        const length = bufferToInt(reader.read(2));
        const bytes = reader.read(length);

        constantPool.push({ tagName, length, bytes: bytes.toString() });
      }
      break;
    case 'CONSTANT_NameAndType':
      {
        const nameIndex = bufferToInt(reader.read(2));
        const descriptorIndex = bufferToInt(reader.read(2));

        constantPool.push({ tagName, nameIndex, descriptorIndex });
      }
      break;
    case 'CONSTANT_Class':
      {
        const nameIndex = bufferToInt(reader.read(2));

        constantPool.push({ tagName, nameIndex });
      }
      break;
    case 'CONSTANT_Methodref':
      {
        const classIndex = bufferToInt(reader.read(2));
        const nameAndTypeIndex = bufferToInt(reader.read(2));

        constantPool.push({ tagName, classIndex, nameAndTypeIndex });
      }
      break;
    default:
      throw new Error(`Not implemented tag ${tagName}`);
  }
}

const accessFlags = reader.read(2);
const thisClass = reader.read(2);
const superClass = reader.read(2);
const interfacesCount = reader.read(2);
// const interfaces = reader.read(2); // since there are no interfaces, we can skip this
const fieldsCount = bufferToInt(reader.read(2));

console.log(`super class =`, constantPool[constantPool[bufferToInt(superClass) - 1].nameIndex - 1].bytes);
console.log(`this class =`, constantPool[constantPool[bufferToInt(thisClass) - 1].nameIndex - 1].bytes);

for (let i = 0; i < fieldsCount; i++) {
  const accessFlags = bufferToInt(reader.read(2));
  const nameIndex = bufferToInt(reader.read(2));
  const descriptorIndex = bufferToInt(reader.read(2));
  const attributesCount = bufferToInt(reader.read(2));

  console.log(`field ${i} =`, constantPool[nameIndex - 1].bytes, '| type = ', constantPool[descriptorIndex - 1].bytes);
  console.log(`\tnumber of attributes =`, attributesCount);

  for (let j = 0; j < attributesCount; j++) {
    const attributeNameIndex = bufferToInt(reader.read(2));
    const attributeLength = bufferToInt(reader.read(4));
    const attributeBytes = reader.read(attributeLength);
    const attributeName = constantPool[attributeNameIndex - 1].bytes;

    if (attributeName === 'ConstantValue') {
      const constantValueIndex = bufferToInt(attributeBytes);
      const attributeKind = constantPool[constantValueIndex - 1].tagName;
      let value;
      if (attributeKind === 'CONSTANT_Integer') {
        value = bufferToInt(constantPool[constantValueIndex - 1].bytes);
      } else if (attributeKind === 'CONSTANT_String') {
        value = constantPool[constantPool[constantValueIndex - 1].stringIndex - 1].bytes;
      }
      //

      console.log(`\t\tattribute ${j + 1} =`, attributeName, '| value =', value);
      continue;
    }

    throw `Not implemented attribute ${attributeName}`;
  }
}

console.log('\n\n------------------------------\n\n');
const methodsCount = bufferToInt(reader.read(2));
const clazz = {
  methods: {},
};

for (let i = 0; i < methodsCount; i++) {
  const flags = reader.read(2);
  const nameIndex = bufferToInt(reader.read(2));
  const descriptorIndex = bufferToInt(reader.read(2));
  const attributesCount = bufferToInt(reader.read(2));
  const attributeNameIndex = bufferToInt(reader.read(2));
  const attributeLength = bufferToInt(reader.read(4));
  const attributeBytes = reader.read(attributeLength);

  const methodType = constantPool[attributeNameIndex - 1].bytes;
  if (methodType !== 'Code') {
    throw `Not implemented attribute ${methodType}`;
  }

  const methodName = constantPool[nameIndex - 1].bytes;
  const methodDescriptor = constantPool[descriptorIndex - 1].bytes;
  const methodCode = attributeBytes;

  clazz.methods[methodName] = {
    descriptor: methodDescriptor,
    code: methodCode,
    codeLength: attributeLength,
  };
  // that is how the attribute bytes should be interpreted
  // https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-4.html#jvms-4.7.3
  //
  //  u2 max_stack;
  //  u2 max_locals;
  //  u4 code_length;
  //  u1 code[code_length];
  //  u2 exception_table_length;
  //  {   u2 start_pc;
  //      u2 end_pc;
  //      u2 handler_pc;
  //      u2 catch_type;
  //  } exception_table[exception_table_length];
  //  u2 attributes_count;
  //  attribute_info attributes[attributes_count];

  // console.log(`Method ${i + 1} | nameIndex = `, constantPool[nameIndex - 1].bytes,
  //   '\n| descriptor (aka type) = ', constantPool[descriptorIndex - 1].bytes,
  //   '\n| attributesCount = ', attributesCount,
  //   '\n| attributeName = ', constantPool[attributeNameIndex - 1].bytes,
  //   '\n| attributeLength = ', attributeLength,
  //   '\n| attributeBytes (code, actually) = ', attributeBytes.toString('hex')
  // )
  // console.log()
}

console.log('-----------');

function parseAttributeInfo(attributeBytes) { }

const attributesCount = bufferToInt(reader.read(2));
for (let i = 0; i < attributesCount; i++) {
  const attributeNameIndex = bufferToInt(reader.read(2));
  const attributeLength = bufferToInt(reader.read(4));
  const attributeBytes = reader.read(attributeLength); // source file index when attributeName is SourceFile


  if (constantPool[attributeNameIndex - 1].bytes === 'SourceFile') {
    const sourceFileIndex = bufferToInt(attributeBytes);
    const sourceFile = constantPool[sourceFileIndex - 1].bytes;

    console.log('Attribute ', i + 1, '| attributeNameIndex = ', constantPool[attributeNameIndex - 1].bytes,
      '\n| attributeLength = ', attributeLength,
      '\n| sourceFile = ', sourceFile);

    continue;
  }

  console.log('Attribute ', i + 1, '| attributeNameIndex = ', constantPool[attributeNameIndex - 1].bytes,
    '\n| attributeLength = ', attributeLength,
    '\n| attributeBytes = ', attributeBytes.toString('hex'));
}

const mainMethod = clazz.methods['main'];
const mainMethodCode = mainMethod.code;

console.log('\n\n-------------- method main ----------------\n\n');

function parseCodeAttribute(codeAttribute) {
  const byteReader = new BufferReader(codeAttribute);
  const maxStack = bufferToInt(byteReader.read(2));
  const maxLocals = bufferToInt(byteReader.read(2));
  const codeLength = bufferToInt(byteReader.read(4));
  const code = byteReader.read(codeLength);
  const exceptionTableLength = bufferToInt(byteReader.read(2));
  const exceptionTable = [];

  for (let i = 0; i < exceptionTableLength; i++) {
    const startPc = bufferToInt(byteReader.read(2));
    const endPc = bufferToInt(byteReader.read(2));
    const handlerPc = bufferToInt(byteReader.read(2));
    const catchType = bufferToInt(byteReader.read(2));

    exceptionTable.push({ startPc, endPc, handlerPc, catchType });
  }

  const attributesCountMain = bufferToInt(byteReader.read(2));
  for (let i = 0; i < attributesCountMain; i++) {
    const attributeNameIndex = bufferToInt(byteReader.read(2));
    const attributeLength = bufferToInt(byteReader.read(4));
    const type = constantPool[attributeNameIndex - 1].bytes;


    if (type === 'LineNumberTable') {
      const lineNumberTableLength = bufferToInt(byteReader.read(2));
      const lineNumberTable = [];

      for (let j = 0; j < lineNumberTableLength; j++) {
        const startPc = bufferToInt(byteReader.read(2));
        const lineNumber = bufferToInt(byteReader.read(2));

        lineNumberTable.push({ startPc, lineNumber });
      }
      console.log({ lineNumberTable })

      // console.log('Attribute ', i + 1, '| attributeNameIndex = ', constantPool[attributeNameIndex - 1].bytes,
      //   '\n| attributeLength = ', attributeLength,
      //   '\n| sourceFile = ', sourceFile);

      continue;
    }
  }

  return {
    maxStack,
    maxLocals,
    codeLength,
    code,
    exceptionTable,
  };
}

const opcodes = {
  0x03: 'iconst_0',
  0x11: 'sipush',
  0x12: 'ldc',
  0x2a: 'aload_0',
  0xb1: 'return',
  0xb2: 'getstatic',
  0xb3: 'putstatic',
  0xb6: 'invokevirtual',
  0xb7: 'invokespecial',
  0xb8: 'invokestatic',
  0xbc: 'newarray',
};

function disasembleMethod(methodName, code) {
  console.log(`Disassembling method ${methodName} ---\ncode: ${code.toString('hex')}\n`);

  const byteCodeReader = new BufferReader(code);
  while (byteCodeReader.position < code.length) {
    const byte = byteCodeReader.read();
    const opcode = opcodes[byte[0]];

    switch (opcode) {
      case 'aload_0':
        {
          console.log('\taload_0');
        }
        break;

      case 'invokespecial':
        {
          const index = bufferToInt(byteCodeReader.read(2));

          console.log('\tinvokespecial', index);
        }
        break;

      case 'iconst_0':
        console.log('\ticonst_0');
        break;

      case 'sipush':
        {
          const value = bufferToInt(byteCodeReader.read(2));

          console.log('\tsipush', value);
        }
        break;

      case 'ldc':
        {
          const index = bufferToInt(byteCodeReader.read(1));

          console.log('\tldc', index);
        }
        break;

      case 'return':
        console.log('\treturn');
        break;

      case 'getstatic':
        {
          const index = bufferToInt(byteCodeReader.read(2));

          console.log('\tgetstatic', index);
        }
        break;

      case 'putstatic':
        {
          const index = bufferToInt(byteCodeReader.read(2));

          console.log('\tputstatic', index);
        }
        break;

      case 'invokevirtual':
        {
          const index = bufferToInt(byteCodeReader.read(2));

          console.log('\tinvokevirtual', index);
        }
        break;

      case 'invokestatic':
        {
          const index = bufferToInt(byteCodeReader.read(2));

          console.log('\tinvokestatic', index);
        }
        break;

    }
  }
}

// class load
const clinitByteCode = parseCodeAttribute(clazz.methods['<clinit>'].code).code;

// main method
const mainByteCode = parseCodeAttribute(clazz.methods['main'].code).code;

// constructor
const initByteCode = parseCodeAttribute(clazz.methods['<init>'].code).code;

console.log()
console.log()
disasembleMethod('<clinit>', clinitByteCode);
console.log()
disasembleMethod('main', mainByteCode);
console.log()
disasembleMethod('<init>', initByteCode);

