// optmizations
// increment can be a single instruction (it can carry a incrementValue so it will respond to both increment and
// decrement)
//
// backward and forward can be just jUMP


export const TOKEN_TYPES = {
  INCREMENT: 'INCREMENT',
  DECREMENT: 'DECREMENT',
  FORWARD: 'FORWARD', // jmp
  BACKWARD: 'BACKWARD', // jmp
  JMP_FORWARD: 'JMP_FORWARD', // jmpzero
  JMP_BACKWARD: 'JMP_BACKWARD', // jmpnonzero
  OUTPUT: 'OUTPUT',
  INPUT: 'INPUT',
  EOF: 'EOF',
  DOT: 'DOT',
};

export function tokenizeBrainfuck(code) {
  let position = 0;
  const tokens = [];

  while (position < code.length) {
    const currentChar = code[position];

    switch (currentChar) {
      case '.':
        tokens.push({ type: TOKEN_TYPES.DOT })
        break;
      case '+':
        tokens.push({ type: TOKEN_TYPES.INCREMENT })
        break;

      case '-':
        tokens.push({ type: TOKEN_TYPES.DECREMENT })
        break;

      case '>':
        tokens.push({ type: TOKEN_TYPES.FORWARD })
        break;

      case '<':
        tokens.push({ type: TOKEN_TYPES.BACKWARD })
        break;

      case '[':
        tokens.push({ type: TOKEN_TYPES.JMP_FORWARD })
        break;

      case ']':
        tokens.push({ type: TOKEN_TYPES.JMP_BACKWARD })
        break;
      case ' ':
      case '\n':
      case '\t':
        // ignore whitespaces
        break
      default:
        throw `unexpected symbol ${currentChar}`
    }

    position++; // advance;
  }

  tokens.push({ type: TOKEN_TYPES.EOF })

  return tokens;
}


export function parseTokens(tokens) {
  // instead of using straight tokens i should have proper objects for expressions
  // they could have a redicble flag and a reduce function, the reduce would evaluate each object
  // reducible flag would determine if that expression is reducble
  const parsed = [];
  const stack = [];
  let cellCount = 0;

  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];

    switch (token.type) {
      case TOKEN_TYPES.DOT:
        parsed.push({ token, cell: cellCount });
        break;
      case TOKEN_TYPES.EOF:
        parsed.push({ token });
        break;
      case TOKEN_TYPES.INCREMENT:
      case TOKEN_TYPES.DECREMENT:
        parsed.push({ token, cell: cellCount });
        break;

      case TOKEN_TYPES.BACKWARD:
        parsed.push({ token, jmp: --cellCount });
        break;

      case TOKEN_TYPES.FORWARD:
        parsed.push({ token, jmp: ++cellCount });
        break;
      case TOKEN_TYPES.JMP_FORWARD:
        stack.push({ token, pos: i });
        parsed.push({ token, jmp: null })
        break;
      case TOKEN_TYPES.JMP_BACKWARD:
        {
          const stackElem = stack.pop();
          if (!stackElem) {
            throw `unmatched ] at position ${i}`;
          }

          if (stackElem.token.type !== TOKEN_TYPES.JMP_FORWARD) {
            throw `unmatched [ at position ${stackElem.pos}`;
          }

          // o jump do inicio do loop vai ser o da posicao atual (que é a mesma do ]) mais um
          parsed[stackElem.pos].jmp = i + 1;

          // o jump do fim do loop vai ser a posicao do inicio do loop mais um
          parsed.push({ token, jmp: stackElem.pos + 1 })
        }
        break;
    }
  }

  return parsed;
}

export function evaluate(instructions) {
  const cells = new Uint8Array(30_000);
  let currentCell = 0;
  let pc = 0;
  let instruction = instructions[pc];
  let jmp = false;
  const stdoutQueue = [];
  while (instruction?.token && instruction.token.type != TOKEN_TYPES.EOF) {
    jmp = false;
    const tokenType = instruction.token.type;
    switch (tokenType) {
      case TOKEN_TYPES.DOT:
        stdoutQueue.push(String.fromCharCode(cells[currentCell]));
        break;
      case TOKEN_TYPES.INCREMENT:
        cells[currentCell] += 1;
        break;
      case TOKEN_TYPES.DECREMENT:
        cells[currentCell] -= 1;
        break;
      case TOKEN_TYPES.FORWARD:
        currentCell += 1;
        break;
      case TOKEN_TYPES.BACKWARD:
        currentCell -= 1;
        break;
      case TOKEN_TYPES.JMP_FORWARD:
        if (cells[currentCell] === 0) {
          jmp = true;
          pc = instruction.jmp;
        }
        break;
      case TOKEN_TYPES.JMP_BACKWARD:
        if (cells[currentCell] !== 0) {
          jmp = true;
          pc = instruction.jmp;
        }
        break;
    }

    if (!jmp) {
      pc++;
    }

    instruction = instructions[pc];
  }

  return {
    cells,
    stdoutQueue,
    currentCell
  };

  // console.table(cells.slice(0, 10))
}

export function execute(code) {
  const tokens = tokenizeBrainfuck(code);
  const parsed = parseTokens(tokens);
  return evaluate(parsed)
}
