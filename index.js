import fs from 'node:fs';
import { increment, input, output, intTo2Bytes, jump_eqz, jump_neqz, move_head, OPCODES } from './helpers/jvm.js';

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

          if (inc === 0) {
            continue; // no-op
          }

          const lastInstruction = instructions[instructions.length - 1];
          if (lastInstruction && lastInstruction.type === 'increment') {
            lastInstruction.inc += inc;
            if (lastInstruction.inc === 0) {
              instructions.pop();
            }
            continue;
          }

          instructions.push({ type: 'increment', inc });
        }
        break;
      case '>':
      case '<':
        const pointerBefore = pointer;
        let pointerChange = c === '>' ? 1 : -1;

        while (['>', '<'].includes(code[i + 1])) {
          const peek = code[i + 1];
          i++;
          pointerChange += peek === '>' ? 1 : -1;
        }

        pointer += pointerChange;

        const lastInstruction = instructions[instructions.length - 1];
        if (lastInstruction && lastInstruction.type === 'move_head' && lastInstruction.head + pointerChange === 0) {
          instructions.pop();
          continue;
        }

        if (pointer === pointerBefore) {
          continue; // no-op
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

/**
 * @param {Array<any>} irInstructions
 * @param {{ input: { fieldRefIndex: number; methodRefIndex: number; }, output: { fieldRefIndex: number; methodRefIndex: number; } }}
 */
export function brainfuckIRToJVM(irInstructions, {
  input: iin,
  output: out
}) {
  const stackMapTable = [];
  let code = [
    ...[0x11, ...intTo2Bytes(30_000)], // sipush 30000
    ...[0xbc, 0x08], // newarray byte
    ...[0x4c], // astore_1 (cells)
    ...[0x03], // iconst_0
    ...[0x3d], // istore_2 (head)
  ];
  const patches = [];
  let jvmPc = code.length;
  const labelPC = new Map(); // IR index -> bytecode pc

  for (let i = 0; i < irInstructions.length; ++i) {
    labelPC.set(i, jvmPc);
    const ins = irInstructions[i];

    switch (ins.type) {
      case 'output':
        {
          const jvmIns = output({
            fieldRef: out.fieldRefIndex,
            methodRef: out.methodRefIndex
          });
          code = code.concat(jvmIns)
          jvmPc += jvmIns.length;
        }
        break;
      case 'input':
        {
          const jvmIns = input({
            fieldRef: iin.fieldRefIndex,
            methodRef: iin.methodRefIndex
          });
          code = code.concat(jvmIns)
          jvmPc += jvmIns.length;
        }
        break;
      case 'increment':
        {
          const jvmIns = increment(ins.inc);
          code = code.concat(jvmIns)
          jvmPc += jvmIns.length;
        }
        break;
      case 'move_head':
        {
          const jvmIns = move_head(ins.head);
          code = code.concat(jvmIns)
          jvmPc += jvmIns.length;
        }
        break;
      case 'jump_eqz':
        {
          const jvmIns = jump_eqz(0);
          jvmPc += jvmIns.length;
          // console.log({jvmIns: Buffer.from(jvmIns).toString('hex')})
          // setting -2 to put it right in the placeholder
          patches.push({ at: jvmPc - 2, targetIr: ins.jmp, kind: 'cond' });
          code = code.concat(jvmIns);
          stackMapTable.push({});
        }
        break;
      case 'jump_neqz':
        {
          const jvmIns = jump_neqz(0);
          jvmPc += jvmIns.length;
          // console.log({jvmIns: Buffer.from(jvmIns).toString('hex')})
          // setting -2 to put it right in the placeholder
          patches.push({ at: jvmPc - 2, targetIr: ins.jmp, kind: 'cond' });
          code = code.concat(jvmIns);
          stackMapTable.push({});
        }
        break;
      case 'halt':
        code = code.concat(OPCODES.return);
        break;
      default:
        throw 'Unknown instruction ' + ins.type;
    }
  }

  for (let i = 0; i < patches.length; ++i) {
    const p = patches[i];
    const targetPc = labelPC.get(p.targetIr);
    const branchPc = p.at - 1; // opcode is 1 byte before the offset

    // calculating the offset from the branch instruction
    const offset = targetPc - branchPc;
    code.splice(p.at, 2, ...intTo2Bytes(offset));

    // const previousStackFrameOffsetDelta = stackMapTable[i - 1]?.offsetDelta + 1 || 0;
    stackMapTable[i] = {
      targetPc,
    };
  }

  stackMapTable.sort((a, b) => a.targetPc - b.targetPc);

  for (let i = 0; i < stackMapTable.length; ++i) {
    const previousStackFramePc = stackMapTable[i - 1]?.targetPc || -1;
    const offsetDelta = stackMapTable[i].targetPc - (previousStackFramePc + 1);

    stackMapTable[i].offsetDelta = offsetDelta;

    if (offsetDelta > 63) {
      stackMapTable[i].frameType = 251; // same frame extended
    }
  }

  stackMapTable[0].frameType = 253;
  stackMapTable[0].locals = [
    { type: 7, cpoolIndex: 21 }, // byte[] the cells
    { type: 1 }, // int the head
  ];

  return {
    code: Buffer.from(code),
    stackMapTable,
  };
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
