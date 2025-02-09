import readline from 'node:readline';
import { execute } from './index.js';

const storage = {
  cells: [],
  currentCell: null
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'brainf*ck> ',
  history: [
    '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.',
    '++++++++++>++++++[<++++++++++>-]<-.-.>>+++ + +++[<<+++>>-]<<.',
    '++++++++++>++++++[<++++++++++>-]<-.-.>>+++ + +++[<<+++>>-]<<.>++++[>++++ ++++<-]>.<<------.>+++++ +++++[<->-]<.+++.>++[<+++++>-]<.>+++++[<---->-]<-.>>+.'
  ]
});

rl.prompt();

rl.on('line', (code) => {
  if (!code.trim().length) {
    rl.prompt();
    return;
  }

  if (code === '.cells') {
    console.table(storage.cells.slice(0, 10))
    console.log({ currentCell: storage.currentCell })
    rl.prompt();
    return;
  }


  const { cells, stdoutQueue, currentCell } = execute(code)

  storage.cells = cells;
  storage.currentCell = currentCell;

  if (stdoutQueue.length) {
    const fullText = stdoutQueue.join('');
    console.log(`out: ${fullText}\n`);
  }

  rl.prompt();
});
