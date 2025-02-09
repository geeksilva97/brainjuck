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
