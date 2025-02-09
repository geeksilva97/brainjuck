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

const result = parseBrainfuck(fs.readFileSync('./code.bf', { encoding: 'utf8' }));
console.log({result});

 // executeBrainfuck(fs.readFileSync('./code.bf', { encoding: 'utf8' }));

