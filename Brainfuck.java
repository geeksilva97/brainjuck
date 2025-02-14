class AnotherClass {
  static void anotherMethod() {
    System.out.println("Another class!");
  }
}

class Brainfuck {
  public static String message = "Hello, World!";
  public static byte[] memory = new byte[30000];
  public static int pointer = 0;

  public static void main(String[] args) {
    System.out.println(message); 
    AnotherClass.anotherMethod();
  }
}
