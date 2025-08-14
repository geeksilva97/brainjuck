public class BrainfuckProgram {
    public static void main(String[] args) {
        int[] cells = new int[30000];  // Memory array
        int pointer = 0;               // Current cell pointer

        // +++++
        cells[pointer] += 5;           // Increment current cell by 5

        // [
        while (cells[pointer] != 0) {  // Loop while current cell is not zero
            // <
            pointer--;                 // Move pointer left

            // +
            cells[pointer]++;          // Increment current cell

            // >
            pointer++;                 // Move pointer right

            // -
            cells[pointer]--;          // Decrement current cell
        }
        // ]
    }
}
