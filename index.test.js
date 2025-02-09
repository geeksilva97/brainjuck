import test, { describe, it } from 'node:test';
import { parseTokens, TOKEN_TYPES, tokenizeBrainfuck } from './index.js';
import assert from 'node:assert';

test('brainfuck tokenization', () => {
  const tokens = tokenizeBrainfuck(`
  ++
  >
  +
  [
    <
    +
    >
    -
  ]
  `)

  assert.deepStrictEqual(tokens, [
    { type: TOKEN_TYPES.INCREMENT },
    { type: TOKEN_TYPES.INCREMENT },
    { type: TOKEN_TYPES.FORWARD },
    { type: TOKEN_TYPES.INCREMENT },
    { type: TOKEN_TYPES.JMP_FORWARD },
    { type: TOKEN_TYPES.BACKWARD },
    { type: TOKEN_TYPES.INCREMENT },
    { type: TOKEN_TYPES.FORWARD },
    { type: TOKEN_TYPES.DECREMENT },
    { type: TOKEN_TYPES.JMP_BACKWARD },
    { type: TOKEN_TYPES.EOF },
  ])
});

test.only('brainfuck parsing', () => {
  const tokens = tokenizeBrainfuck(`
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

  console.log({tokens})

  const parsed = parseTokens(tokens);

  console.log(parsed)
});
