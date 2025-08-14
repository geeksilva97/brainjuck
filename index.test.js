import test, { describe, it } from 'node:test';
import { parseBrainfuck } from './index.js';


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
