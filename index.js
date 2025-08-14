import fs from 'node:fs';
import { increment, intTo2Bytes, OPCODES } from './helpers/jvm.js';

// By this point, we have a parser that does nothing. It only gives the commands a more complext structure to work with.
// We can do better
export function parseBrainfuck(code) {
  const instructions = [];
  const loopStack = [];
  let pointer = 0;

  for (let i = 0; i < code.length; ++i) {
    const c = code[i];

    switch (c) {
      case ',':
        instructions.push({ type: 'input' });
        break;
      case '.':
        instructions.push({ type: 'output' });
        break;
      case '+':
      case '-':
        {
          let inc = c === '+' ? 1 : -1;

          while (['+', '-'].includes(code[i + 1])) {
            const peek = code[i + 1];
            i++;
            inc += peek === '+' ? 1 : -1;
          }
          instructions.push({ type: 'increment', inc });
        }
        break;
      case '>':
      case '<':
        pointer += c === '>' ? 1 : -1;
        while (['>', '<'].includes(code[i + 1])) {
          const peek = code[i + 1];
          i++;
          pointer += peek === '>' ? 1 : -1;
        }
        instructions.push({ type: 'move_head', head: pointer });
        break;
      case '[':
        loopStack.push([c, instructions.length]);
        // setting jmp as -1 till the end of loop is reached and the jmp can actually be computed
        instructions.push({ type: 'jump_eqz', jmp: -1 });
        break;
      case ']':
        {
          const [char, pos] = loopStack.pop();
          if (char !== '[') {
            throw new Error('Unbalanced brackets');
          }

          instructions[pos].jmp = instructions.length + 1;
          instructions.push({ type: 'jump_neqz', jmp: pos + 1 });
        }
        break;
    }
  }

  instructions.push({ type: 'halt' })

  return instructions;
}

export function brainfuckIRToJVM(irInstructions) {
  let code = [
    ...[0x11, ...intTo2Bytes(30_000)], // sipush 30000
    ...[0xbc, 0x08], // newarray byte
    ...[0x4c], // astore_1 (cells)
    ...[0x03], // iconst_0
    ...[0x3d], // istore_2 (head)
  ];
  const jvmPc = 8;
  const labelPC = new Map(); // IR index -> bytecode pc

  for (let i = 0; i < irInstructions.length; ++i) {
    labelPC.set(i, jvmPc);
    const ins = irInstructions[i];

    console.log({ins})

    switch (ins.type) {
      case 'increment':
        code = code.concat(increment(ins.inc))
        break;

      case 'halt':
        code = code.concat(OPCODES.return);
        break;
      default:
        throw 'Unknown instruction ' + ins.type;
    }
  }

  return Buffer.from(code);
}

function readByte() {
  let buffer = Buffer.alloc(3);
  fs.readSync(0, buffer, 0, 3);
  buffer = buffer.filter(byte => byte !== 0 && byte !== 10 && byte !== 13);

  let data = buffer.toString('utf8');
  if (isNaN(data)) return data.charCodeAt(0);

  data = Number(data);

  if (data < 0 || data > 255) {
    throw new Error('Invalid byte');
  }

  return data;
}

export function executeBrainfuck(code) {
  const instructions = parseBrainfuck(code);
  const memory = new Uint8Array(30000);
  let pointer = 0;
  let pc = 0;

  while (true) {
    // fetch
    const instruction = instructions[pc];
    // console.log({ pc, instruction, pointer, pointerContent: memory[pointer] })

    // decode and execute
    switch (instruction.type) {
      case 'output':
        process.stdout.write(String.fromCharCode(memory[pointer]));
        process.stdout.write('\n');
        break;
      case 'input':
        memory[pointer] = readByte();
        break;
      case 'increment':
        memory[pointer] += instruction.inc;
        break;
      case 'move_head':
        pointer = instruction.head;
        break;
      case 'jump_eqz':
        if (memory[pointer] === 0) {
          pc = instruction.jmp;
          continue;
        }
        break;
      case 'jump_neqz':
        if (memory[pointer] !== 0) {
          pc = instruction.jmp;
          continue;
        }
        break;
      case 'halt':
        console.table(memory.slice(0, 10));
        return;
      default:
        throw Error(`Unknown instruction ${instruction.type}`);
    }

    pc++;
  }
}
