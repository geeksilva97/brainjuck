import java.io.IOException;

public class InputAndOutput {
  public static void main(String[] args) throws IOException {
    byte[] memory = new byte[30000];
    int head = 0;
    memory[head] = (byte) System.in.read();   // reads ASCII code
    System.out.println((char) memory[head]);
  }
}
