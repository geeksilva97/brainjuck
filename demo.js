import { parseBrainfuck } from './index.js';

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

console.log(parseBrainfuck('++++[[-]]--'));
