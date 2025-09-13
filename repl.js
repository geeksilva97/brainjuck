import readline from 'node:readline';
import { parseBrainfuck } from './index.js';

const storage = {
  cells: new Uint8Array(20),
  pointer: 0
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'brainjuck> ',
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

  if (code === '.clear') {
    storage.cells = new Uint8Array(20);
    storage.pointer = 0;
    console.log('Cleared memory');
    rl.prompt();
    return;
  }

  if (code === '.cells') {
    console.log('Pointer:', storage.pointer);
    console.log('Cells:');
    console.table(storage.cells.slice(0, 10))
    rl.prompt();
    return;
  }

  const instructions = parseBrainfuck(code);
  // console.log(instructions)

  let pc = 0;
  let output = '';
  while (true) {
    const instruction = instructions[pc];

    if (instruction?.type === 'halt') {
      break;
    }

    switch (instruction.type) {
      case 'input':
        console.error('Input not supported in REPL');
        break;
      case 'output':
        output += String.fromCharCode(storage.cells[storage.pointer]);
        // process.stdout.write(String.fromCharCode(storage.cells[storage.pointer]));
        // process.stdout.write('\n');
        break;
      case 'increment':
        // console.log('Increment', instruction.inc, 'at', storage.pointer);
        storage.cells[storage.pointer] += instruction.inc;
        break;
      case 'move_head':
        if (instruction.head < 0) {
          storage.pointer += instruction.head;
        } else {
          storage.pointer = instruction.head;
        }
        break;
      case 'jump_eqz':
        if (storage.cells[storage.pointer] === 0) {
          pc = instruction.jmp;
          continue;
        }
        break;
      case 'jump_neqz':
        if (storage.cells[storage.pointer] !== 0) {
          pc = instruction.jmp;
          continue;
        }
        break;
      default:
        throw Error(`Unknown instruction ${instruction.type}`);
    }

    pc++;
  }

  if (output.length) {
    console.log(`out: ${output}\n`);
  }

  // const { cells, stdoutQueue, currentCell } = executeBrainfuck(code, { trace: false }, Uint8Array.from(storage.cells.length ? storage.cells : new Uint8Array(30000)));

  // storage.cells = cells;
  // storage.currentCell = currentCell;

  // if (stdoutQueue.length) {
  //   const fullText = stdoutQueue.join('');
  //   console.log(`out: ${fullText}\n`);
  // }

  rl.prompt();
});
