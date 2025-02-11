import fs, { openSync } from 'node:fs';

// instructions
// https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-6.html#jvms-6.5

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

console.log(reader.position, ' bytes read')

console.log('\n\n------------------------------\n\n');
const methodsCount = bufferToInt(reader.read(2));

for (let i = 0; i < methodsCount; i++) {
  const flags = reader.read(2);
  const nameIndex = bufferToInt(reader.read(2));
  const descriptorIndex = bufferToInt(reader.read(2));
  const attributesCount = bufferToInt(reader.read(2));
  const attributeNameIndex = bufferToInt(reader.read(2));
  const attributeLength = bufferToInt(reader.read(4));
  const attributeBytes = reader.read(attributeLength);

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

  console.log(`Method ${i + 1} | nameIndex = `, constantPool[nameIndex - 1].bytes,
    '\n| descriptor (aka type) = ', constantPool[descriptorIndex - 1].bytes,
    '\n| attributesCount = ', attributesCount,
    '\n| attributeName = ', constantPool[attributeNameIndex - 1].bytes,
    '\n| attributeLength = ', attributeLength,
    '\n| attributeBytes (code, actually) = ', attributeBytes.toString('hex')
  )
  console.log()
}

console.log('-----------');

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

console.log(constantPool[constantPool[19].nameIndex - 1])
console.log('pushstatic 13', constantPool[constantPool[13].nameIndex - 1].bytes)

// Compiled from "Brainfuck.java"
// class Brainfuck {
//   public static java.lang.String message;

//   public static byte[] memory;

//   public static int pointer;

//   Brainfuck();
//     Code:
//        0: aload_0
//        1: invokespecial #1                  // Method java/lang/Object."
// <init>":()V
//        4: return

//   public static void main(java.lang.String[]);
//     Code:
//        0: getstatic     #7                  // Field java/lang/System.ou
// t:Ljava/io/PrintStream;
//        3: getstatic     #13                 // Field message:Ljava/lang/
// String;
//        6: invokevirtual #19                 // Method java/io/PrintStrea
// m.println:(Ljava/lang/String;)V
//        9: return

//   static {};
//     Code:
//        0: ldc           #25                 // String Hello, World!
//        2: putstatic     #13                 // Field message:Ljava/lang/
// String;
//        5: sipush        30000
//        8: newarray       byte
//       10: putstatic     #27                 // Field memory:[B
//       13: iconst_0
//       14: putstatic     #31                 // Field pointer:I
//       17: return
// }

// reader.read(1) // should throw EOF
