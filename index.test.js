import test from 'node:test';
import { brainfuckIRToJVM, parseBrainfuck } from './index.js';
import { ARRAY_TYPE, intTo2Bytes, increment, OPCODES, sipush, newarray, astore_1, iconst_0, istore_2, move_head, jump_eqz, jump_neqz } from './helpers/jvm.js';

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

test('jump_eqz', (t) => {
  const ins = Buffer.from(jump_eqz(82))
  const expected = Buffer.from([
    0x2b,
    0x1c,
    0x33,
    0x99, ...intTo2Bytes(82)
  ]);

  t.assert.strictEqual(Buffer.compare(ins, expected), 0);
});

test('brainfuck to JVM bytecode', (t) => {
  const instructions = parseBrainfuck(`
  ++++
  --
  >>>>
  +++
  [
    <
    +
    >
    -
  ]
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
    Buffer.from(move_head(4)),
    Buffer.from(increment(3)),
    Buffer.from(jump_eqz(82)),
    Buffer.from(move_head(3)),
    Buffer.from(increment(1)),
    Buffer.from(move_head(4)),
    Buffer.from(increment(-1)),
    Buffer.from(jump_neqz(48)),
    Buffer.from([OPCODES.return]),
  ]);

  console.log(jvmCode.toString('hex'))
  console.log(expectedCode.toString('hex'))

  t.assert.strictEqual(Buffer.compare(jvmCode, expectedCode), 0);
});
