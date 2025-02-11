import fs, { openSync, read } from 'node:fs';

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
console.log({ fieldsCount })

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

for (let i = 0; i < methodsCount; i++) {
  const flags = reader.read(2);
  const nameIndex = bufferToInt(reader.read(2));
  const descriptorIndex = bufferToInt(reader.read(2));
  const attributesCount = bufferToInt(reader.read(2));
  const attributeNameIndex = bufferToInt(reader.read(2));
  const attributeLength = bufferToInt(reader.read(4));
  const attributeBytes = reader.read(attributeLength);

  console.log(`Attribute ${i + 1} | nameIndex = `, constantPool[nameIndex - 1].bytes,
    '\n| descriptorIndex = ', constantPool[descriptorIndex - 1].bytes,
    '\n| attributesCount = ', attributesCount,
    '\n| attributeNameIndex = ', constantPool[attributeNameIndex - 1].bytes,
    '\n| attributeLength = ', attributeLength,
    '\n| attributeBytes = ', attributeBytes.toString('hex')
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

// reader.read(1) // should throw EOF
