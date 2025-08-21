public class BrainfuckJumpExample {
    public static void main(String[] args) {
        // Initialize tape and pointer
        byte[] tape = new byte[30000];
        int ptr = 0;
        
        // +++ (increment cell 3 times)
        tape[ptr] = (byte)(tape[ptr] + 1);
        tape[ptr] = (byte)(tape[ptr] + 1); 
        tape[ptr] = (byte)(tape[ptr] + 1);
        
        // [-] (decrement until zero)
        while (tape[ptr] != 0) {
            tape[ptr] = (byte)(tape[ptr] - 1);
        }
    }
}
