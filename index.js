import fs from 'node:fs';

// By this point, we have a parser that does nothing. It only gives the commands a more complext structure to work with.
// We can do better
export function parseBrainfuck(code) {
  const instructions = [];
  const loopStack = [];

  for (let i = 0; i < code.length; ++i) {
    const c = code[i];

    switch (c) {
      case '+':
        instructions.push({ type: 'increment' });
        break;
      case '-':
        instructions.push({ type: 'decrement' });
        break;
      case '>':
        instructions.push({ type: 'forward' });
        break;
      case '<':
        instructions.push({ type: 'backward' });
        break;
      case '[':
        loopStack.push(c);
        instructions.push({ type: 'begin_loop' });
        break;
      case ']':
        const char = loopStack.pop();
        if (char !== '[') {
          throw new Error('Unbalanced brackets');
        }

        instructions.push({ type: 'end_loop' });
        break;
    }
  }

  return instructions;
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
  const memory = new Uint8Array(30000);
  let pointer = 0;

  for (let i = 0; i < code.length; ++i) {
    const c = code[i];

    switch (c) {
      case '.':
        process.stdout.write(String.fromCharCode(memory[pointer]));
        process.stdout.write('\n');
        break;
      case ',':
        memory[pointer] = readByte();
        break;
      case '+':
        memory[pointer]++;
        break;
      case '-':
        memory[pointer]--;
        break;
      case '>':
        pointer++;
        break;
      case '<':
        pointer--;
        break;
        // not trivial how to implement these jumps
        // we need to keep track of the current instruction and the current loop
        // we can do this by keeping track of the current instruction index and the current loop index
      case '[':
        console.log('need to implement this')
        break;
      case ']':
        console.log('need to implement this')
        break;
    }
  }
}
