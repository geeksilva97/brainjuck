import { ClassFileGenerator } from './class_generator.js';

function intTo2Bytes(num) {
  return [(num >> 8) & 0xFF, num & 0xFF];
}

const move_head = (h) => {
  return []
    .concat([0x11, ...intTo2Bytes(h)]) // sipush h
    .concat([0x3d]) // istore_2 (storing in head)
    ;
};

const increment = (n) => {
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

const input = ({ fieldRef, methodRef }) => {
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

// stack: arrayref, index, value

const output = ({ fieldRef, methodRef }) => {
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

const makeJVMInstructions = ({
  constantPool,
  symbolicConstantPool
}) => {
  const readInput = Buffer.from(input({
    fieldRef: symbolicConstantPool.input.fieldRef,
    methodRef: symbolicConstantPool.input.readMethodrefIndex
  }));

  const printCharToStdOut = Buffer.from(output({
    fieldRef: symbolicConstantPool.output.fieldRef,
    methodRef: symbolicConstantPool.output.printlnMethodrefIndex
  }))

  return [
    ...[0x11, ...intTo2Bytes(30_000)], // sipush 30000
    ...[0xbc, 0x08], // newarray byte
    ...[0x4c], // astore_1 (cells)
    ...[0x03], // iconst_0
    ...[0x3d], // istore_2 (head)
    ...readInput,
    ...printCharToStdOut,
    ...increment(100),
    0xb1 // return
  ];
};

const className = process.argv[2] || 'HelloWorld';
const generator = new ClassFileGenerator();
const helloWorldClass = generator.generateHelloWorldClass(className, makeJVMInstructions);
console.log(`${className}.class generated:`, helloWorldClass.length, 'bytes');

ClassFileGenerator.saveToFile(`${className}.class`, helloWorldClass);
