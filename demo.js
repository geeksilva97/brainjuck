import fs from 'node:fs';
import { executeBrainfuck, parseBrainfuck } from './index.js';

const code = `
  ++
  >
  +++++
  >>>++++
  <<<
  [
    <
    +
    >
    -
  ]
  ++++ ++++
  [
  < +++ +++
  > -
  ]
  < .
`;

executeBrainfuck(fs.readFileSync('./code.bf', { encoding: 'utf8' }));
