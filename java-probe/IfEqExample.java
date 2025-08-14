import java.io.*;

public class IfEqExample {
    public static void main(String[] args) throws IOException {
        int x = System.in.read();

        if (x != 0) {
          return;
        }

        System.out.println("Done");
    }
}
