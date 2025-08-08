import fs, { openSync } from 'node:fs';
import { ByteReader } from './helpers/buffer-reader.js';
const filename = process.argv[2];

if (!filename) throw 'Usafe: print_constant_pool <MyFile.class>';

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

const fd = fs.openSync(filename, 'r');
const reader = new ByteReader(fd);

const magic = reader.read(4);
const minor = reader.read(2);
const major = reader.read(2);

const constantPoolCount = bufferToInt(reader.read(2));

function bufferToInt(buffer) {
  return parseInt(buffer.toString('hex'), 16);
}

const expectedMagic = Buffer.from([0xca, 0xfe, 0xba, 0xbe]);
const isValid = magic.compare(expectedMagic) === 0;
const constantPool = [];

console.log({
  isValid,
  expectedMagic,
  magic,
  minor,
  major,
  constantPoolCount
});

for (let i = 1; i <= constantPoolCount - 1; ++i) {
  const tag = bufferToInt(reader.read(1));
  const [tagName] = TAGS[tag];

  switch (tagName) {
    case 'CONSTANT_Integer':
      {
        const bytes = reader.read(4);
        console.log({bytes})

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

console.table(constantPool)

// const accessFlags = reader.read(2);
// const thisClass = reader.read(2);
// const superClass = reader.read(2);
// const interfacesCount = bufferToInt(reader.read(2));
// // const interfaces = reader.read(2); // since there are no interfaces, we can skip this
// const fieldsCount = bufferToInt(reader.read(2));
// const methodsCount = bufferToInt(reader.read(2));

// const thisClassIndex = bufferToInt(thisClass) - 1;
// console.log(thisClassIndex)


// console.log(`this class index:${thisClassIndex} =`, constantPool[constantPool[thisClassIndex].nameIndex - 1].bytes);
// console.log({ interfacesCount, fieldsCount, thisClass, methodsCount })
