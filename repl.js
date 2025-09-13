import readline from 'node:readline';
import { parseBrainfuck } from './index.js';

const storage = {
  cells: new Uint8Array(20),
  pointer: 0
};

let isDebug = process.env.DEBUG ?? false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'brainjuck> ',
});

rl.prompt();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

rl.on('line', async (code) => {
  if (!code.trim().length) {
    rl.prompt();
    return;
  }

  if (code === '.debug') {
    isDebug = !isDebug;
    console.log('Debug mode', isDebug ? 'ON' : 'OFF');
    rl.prompt();
    return;
  }

  if (code === '.forget') {
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

  const instructions = parseBrainfuck(code).map(inst => {
    // Adjust move_head instructions to be absolute
    if (inst.type === 'move_head') {
      return { ...inst, head: storage.pointer + inst.head };
    }
    return inst;
  });

  let pc = 0;
  let output = '';
  while (true) {
    const instruction = instructions[pc];
    if (isDebug) {
      console.log('PC:', pc, 'Instruction:', instruction);
      await sleep(500); // Slow down execution for visibility
    }

    if (instruction?.type === 'halt') {
      break;
    }

    switch (instruction.type) {
      case 'input':
        console.error('Input not supported in REPL');
        break;
      case 'output':
        output += String.fromCharCode(storage.cells[storage.pointer]);
        break;
      case 'increment':
        // console.log('Increment', instruction.inc, 'at', storage.pointer);
        storage.cells[storage.pointer] += instruction.inc;
        break;
      case 'move_head':
        storage.pointer = instruction.head; // should take a base pointer to calculate the actual position
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

  rl.prompt();
});
