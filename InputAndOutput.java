import java.io.IOException;

public class InputAndOutput {
  public static void main(String[] args) throws IOException {
    int input = System.in.read();   // reads ASCII code
    System.out.println((char) input);
  }
}
