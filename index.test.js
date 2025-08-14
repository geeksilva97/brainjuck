import test from 'node:test';
import { brainfuckIRToJVM, parseBrainfuck } from './index.js';
import { ARRAY_TYPE, increment, OPCODES, sipush, newarray, astore_1, iconst_0, istore_2 } from './helpers/jvm.js';

// TODO: mix sequential increment instructions
// https://github.com/sunjay/brainfuck/blob/master/brainfuck.md
test('brainfuck parsing', (t) => {
  const tokens = parseBrainfuck(`
  ,
  .
  ++
  >
  +
  [
    <
    +
    >
    -
  ]
  `);

  t.assert.deepStrictEqual(tokens, [
    { type: 'input' },
    { type: 'output' },
    { type: 'increment', inc: 2 },
    { type: 'move_head', head: 1 },
    { type: 'increment', inc: 1 },
    { type: 'jump_eqz', jmp: 11 },
    { type: 'move_head', head: 0 },
    { type: 'increment', inc: 1 },
    { type: 'move_head', head: 1 },
    { type: 'increment', inc: -1 },
    { type: 'jump_neqz', jmp: 6 },
    { type: 'halt' }
  ])
});

test('brainfuck to JVM bytecode', (t) => {
  const instructions = parseBrainfuck(`
  ++++
  --
  `);

  const jvmCode = brainfuckIRToJVM(instructions)
  const expectedCode = Buffer.concat([
    sipush(30_000),
    newarray(8, ARRAY_TYPE.T_BYTE),
    astore_1(),
    iconst_0(),
    istore_2(),
    Buffer.from(increment(4)),
    Buffer.from(increment(-2)),
    Buffer.from([OPCODES.return])
  ]);

  console.log(jvmCode)
  console.log(expectedCode)

  t.assert.strictEqual(Buffer.compare(jvmCode, expectedCode), 0);
});
