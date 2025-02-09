import { execute } from './index.js';

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

execute(code);
