import java.io.*;

public class IfEqExample2 {
    public static void main(String[] args) throws IOException {
        int x = 3;
        if (x % 2 == 1) {
            System.out.println("3 is odd");
        } else {
            System.out.println("3 is even");
        }

        if (x % 2 == 0) {
            System.out.println("4 is odd");
        } else {
            System.out.println("4 is even");
        }
        // int x = System.in.read();
        // String name = "edy";

        // if (x != 0) {
        //   return;
        // }

        // if (name.equals("edy")) {
        //     int anewvariable = 10;
        //     System.out.println("Hello, " + name);
        // } else {
        //     System.out.println("Hello, stranger");
        // }

        // System.out.println("Done");
    }
}
