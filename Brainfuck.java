class Brainfuck {
  public static void main(String[] args) {
    byte[] memory = new byte[30000];
    int cell = 0;

    memory[cell]++;
    cell = 1;
    memory[cell] += 5;
    cell = 4;
    // memory[cell] += 4;
    // cell = 1;
  }
}
