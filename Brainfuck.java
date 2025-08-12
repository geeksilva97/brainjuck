class Brainfuck {
  public static byte[] memory = new byte[30000];
  public static int cell = 0;

  private static void loop1() {

  }

  public static void main(String[] args) {
    memory[cell]++;
    cell = 1;
    memory[cell] += 5;
    cell = 4;
    memory[cell] += 4;
    cell = 1;

    if (memory[cell] == 0) {
      loop1();
    }
  }
}
