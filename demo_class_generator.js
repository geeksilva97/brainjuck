import { ClassFileGenerator } from './class_generator.js';
import {
  intTo2Bytes,
  increment,
  input,
  output,
} from './helpers/jvm.js';

const makeJVMInstructions = ({
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
