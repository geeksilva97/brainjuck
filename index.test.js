import test, { describe, it } from 'node:test';
import { parseBrainfuck } from './index.js';
import assert from 'node:assert';


test.only('brainfuck parsing', () => {
  const tokens = parseBrainfuck(`
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
});
