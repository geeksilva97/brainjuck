import test from 'node:test';
import { brainfuckIRToJVM, parseBrainfuck, tokenizeBrainfuck } from './index.js';
import { ARRAY_TYPE, intTo2Bytes, increment, OPCODES, sipush, newarray, astore_1, iconst_0, istore_2, move_head, jump_eqz, jump_neqz } from './helpers/jvm.js';

test('tokenization', (t) => {
  const tokens = tokenizeBrainfuck(`
  +++
  +++
  --
  >>>
  <<<
  `);

  t.assert.deepStrictEqual(tokens, ['+', '+', '+', '+', '+', '+', '-', '-', '>', '>', '>', '<', '<', '<']);
});

test('brainfuck parsing', (t) => {
  const instructions = parseBrainfuck(`
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

  t.assert.deepStrictEqual(instructions, [
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

test('subsequent increments are combined', (t) => {
  const ir = parseBrainfuck(`
  ++++
  ---
  `);

  t.assert.deepStrictEqual(ir, [
    { type: 'increment', inc: 1 },
    { type: 'halt' }
  ]);
});

test('subsequent move_head are combined', (t) => {
  let ir = parseBrainfuck(`
  >>>>
  <<<<
  `);

  t.assert.deepStrictEqual(ir, [
    { type: 'halt' }
  ]);

  ir = parseBrainfuck(`+++>>>><<<<`);

  t.assert.deepStrictEqual(ir, [
    { type: 'increment', inc: 3 },
    { type: 'halt' }
  ]);

  ir = parseBrainfuck(`>>>>+<<<<`);

  t.assert.deepStrictEqual(ir, [
    { type: 'move_head', head: 4 },
    { type: 'increment', inc: 1 },
    { type: 'move_head', head: 0 },
    { type: 'halt' }
  ]);
});

test('combined zero increments are not emitted', (t) => {
  const ir = parseBrainfuck(`
  ++++
  ----
  `);

  t.assert.deepStrictEqual(ir, [
    { type: 'halt' }
  ]);
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

  const { code: jvmCode } = brainfuckIRToJVM(instructions, {
    input: { 
      fieldRefIndex: 0,
      methodRefIndex: 0
    },
    output: {
      fieldRefIndex: 0,
      methodRefIndex: 0
    }
  })
  const expectedCode = Buffer.concat([
    sipush(30_000),
    newarray(8, ARRAY_TYPE.T_BYTE),
    astore_1(),
    iconst_0(),
    istore_2(),
    Buffer.from(increment(2)),
    Buffer.from(move_head(4)),
    Buffer.from(increment(3)),
    Buffer.from(jump_eqz(37)),
    Buffer.from(move_head(3)),
    Buffer.from(increment(1)),
    Buffer.from(move_head(4)),
    Buffer.from(increment(-1)),
    Buffer.from(jump_neqz(-31)),
    Buffer.from([OPCODES.return]),
  ]);

  // console.log(jvmCode.toString('hex'))
  // console.log(expectedCode.toString('hex'))

  t.assert.strictEqual(Buffer.compare(jvmCode, expectedCode), 0);
});
