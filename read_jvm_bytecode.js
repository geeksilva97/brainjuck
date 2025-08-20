import fs from 'node:fs';
import { ByteReader, BufferReader } from './helpers/buffer-reader.js';

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

const className = process.argv[2] || './Brainfuck.class';
const fd = fs.openSync(className, 'r');
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

const methodsCount = bufferToInt(reader.read(2));
const clazz = {
  methods: {},
};

const asHex = (n) => {
  if (n instanceof Buffer) {
    return `0x${n.toString('hex')}`;
  }
  return '0x' + n.toString(16);
};

/**
 * @param {BufferReader} reader
 * @returns {Array<{ maxStack: number; maxLocals: number; codeLength: number; codeFirstByteAt: number; code: Buffer; exceptionTableLength: number; attributes: Array<any> }>}
 */
function parseCodeAttribute2(reader) {
  // Code_attribute {
  //     u2 attribute_name_index;
  //     u4 attribute_length;
  //     u2 max_stack;
  //     u2 max_locals;
  //     u4 code_length;
  //     u1 code[code_length];
  //     u2 exception_table_length;
  //     {   u2 start_pc;
  //         u2 end_pc;
  //         u2 handler_pc;
  //         u2 catch_type;
  //     } exception_table[exception_table_length];
  //     u2 attributes_count;
  //     attribute_info attributes[attributes_count];
  // }
  // the first six bytes were consumed in the parseAttributes already

  const maxStack = bufferToInt(reader.read(2));
  const maxLocals = bufferToInt(reader.read(2));
  const codeLength = bufferToInt(reader.read(4));
  const codeFirstByteAt = reader.position;
  const actualCode = reader.read(codeLength);
  const exceptionTableLength = bufferToInt(reader.read(2));
  reader.read(exceptionTableLength);
  const codeAttributesCount = bufferToInt(reader.read(2));
  const attrs = parseAttributes(reader, codeAttributesCount);

  return {
    maxStack,
    maxLocals,
    codeLength,
    codeFirstByteAt,
    code: actualCode,
    exceptionTableLength,
    attributes: attrs
  };
}

/**
 * @param {BufferReader} reader
 * @returns {number}
 */
function parseSourceFileAttribute(reader) {
  // SourceFile_attribute {
  //     u2 attribute_name_index;
  //     u4 attribute_length;
  //     u2 sourcefile_index;
  // }
  // the first six bytes were consumed in the parseAttributes already
  return bufferToInt(reader.read(2));
}

/**
 * @param {BufferReader} reader
 * @returns {Array<{ line_number: number; start_pc: number; }>}
 */
function parseLineNumberTableAttribute(reader) {
  // LineNumberTable_attribute {
  //     u2 attribute_name_index;
  //     u4 attribute_length;
  //     u2 line_number_table_length;
  //     {   u2 start_pc;
  //         u2 line_number;	
  //     } line_number_table[line_number_table_length];
  // }
  // the first six bytes were consumed in the parseAttributes already
  const lineNumberTableLength = bufferToInt(reader.read(2));

  const lineNumberTable = [];
  for (let i = 0; i < lineNumberTableLength; ++i) {
    const start_pc = bufferToInt(reader.read(2));
    const line_number = bufferToInt(reader.read(2));

    lineNumberTable.push({ line_number, start_pc })
  }

  return lineNumberTable;
}

/**
 * @type
 * @param {number} attrCount
 * @param {BufferReader} reader
 * @returns {Array<{ nameIndex: number; resolvedName: string; length: number; bytes: Buffer; attributes: Array<any> }>}
 */
function parseAttributes(reader, attrCount) {
  const attrs = [];
  for (let i = 0; i < attrCount; i++) {
    const attributeNameIndex = bufferToInt(reader.read(2));
    const attributeLength = bufferToInt(reader.read(4));
    const attributePosition = reader.position;
    const attributeBytes = reader.read(attributeLength);
    const attributeName = constantPool[attributeNameIndex - 1].bytes;

    const currentAttr = {
      nameIndex: attributeNameIndex,
      resolvedName: attributeName,
      length: attributeLength,
      bytes: attributeBytes,
      attributePosition,
      data: {}
    };

    switch (attributeName) {
      case 'Code':
        currentAttr.data = parseCodeAttribute2(
          new BufferReader(attributeBytes, false)
        );
        break;

      case 'LineNumberTable':
        currentAttr.data = parseLineNumberTableAttribute(
          new BufferReader(attributeBytes)
        );
        break;
      case 'SourceFile':
        currentAttr.data = parseSourceFileAttribute(
          new BufferReader(attributeBytes)
        );
        break;
      default:
        console.warn(`Unable to parse attribute of kind ${attributeName}`);
        continue;
      // throw `Unable to parse attribute of kind ${attributeName}`;
    }

    attrs.push(currentAttr);
  }

  return attrs;
}

for (let i = 0; i < methodsCount; i++) {
  const flags = reader.read(2);
  const nameIndex = bufferToInt(reader.read(2));
  const descriptorIndex = bufferToInt(reader.read(2));
  const attributesCount = bufferToInt(reader.read(2));

  const methodName = constantPool[nameIndex - 1].bytes;
  const attrs = parseAttributes(reader, attributesCount);

  clazz.methods[methodName] = {
    nameIndex,
    attributesCount,
    descriptorIndex,
    resolvedDescriptor: constantPool[descriptorIndex - 1].bytes,
    flags,
    attributes: attrs
  };
}

const classAttributesCount = bufferToInt(reader.read(2));
const classAttributes = parseAttributes(reader, classAttributesCount);

const opcodes = {
  0x03: 'iconst_0',
  0xbc: 'newarray',
  0x11: 'sipush',
  0x12: 'ldc',
  0x4b: 'astore_0',
  0x4c: 'astore_1',
  0x4d: 'astore_2',
  0x2a: 'aload_0',
  0xb1: 'return',
  0xb2: 'getstatic',
  0xb3: 'putstatic',
  0xb6: 'invokevirtual',
  0xb7: 'invokespecial',
  0xb8: 'invokestatic',
  0xbc: 'newarray',
  0xa7: 'goto',
  0x99: 'ifeq',
  0xa0: 'if_icmpne',
  0x9a: 'ifne',
};

const ARRAY_TYPES = {
  10: 'int'
};

function disasembleMethod(methodName) {
  const method = clazz.methods[methodName];
  if (!method) throw 'method not found';

  const methodCodeAttr = method.attributes.find(attr => attr.resolvedName === 'Code');

  if (!methodCodeAttr) throw `Could not find a Code attribute in the method ${methodName}`;

  console.log(`\n---------- Disasembling method "${methodName}" ---------\n`);

  if (methodName === 'main') {
    console.log(methodCodeAttr)
  }

  const code = methodCodeAttr.data.code;
  const byteCodeReader = new BufferReader(code);
  while (byteCodeReader.position < code.length) {
    // console.log('PC =', byteCodeReader.position, 'of', code.length);
    const byte = byteCodeReader.read();
    const opcode = opcodes[byte[0]];

    switch (opcode) {
      case 'newarray':
        {
          // https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-6.html#jvms-6.5.newarray
          // 10 - integer
          const arrayType = bufferToInt(byteCodeReader.read(1));
          console.log('\tnewarray', { type: ARRAY_TYPES[arrayType] || arrayType });
        }
        break;

      case 'astore_1':
        {
          console.log('\tastore_1');
        }
        break;
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

          console.log('\tsipush', value, ` (opcode = 0x${byte[0].toString(16)}; value = 0x${value.toString(16)})`);
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

      case 'goto':
      case 'ifeq':
      case 'if_icmpne':
      case 'ifne':
        {
          const pc = bufferToInt(byteCodeReader.read(2));

          console.log(`\t${opcode}`, pc);
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

const sourceFileAttribute = classAttributes.find(attr => attr.resolvedName === 'SourceFile');
const sourceFilename = sourceFileAttribute ? constantPool[sourceFileAttribute.data - 1] : { bytes: '(none)' };

console.log();
console.log('filename', sourceFilename.bytes);
console.log(`super class =`, constantPool[constantPool[bufferToInt(superClass) - 1].nameIndex - 1].bytes);
console.log(`this class =`, constantPool[constantPool[bufferToInt(thisClass) - 1].nameIndex - 1].bytes);

console.table(constantPool.reduce((acc, current, index) => {
  acc[index + 1] = current;
  return acc;
}, {}));

// disasembleMethod('<init>');
disasembleMethod('main');
