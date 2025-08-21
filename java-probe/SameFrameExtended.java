public class SameFrameExtended {
    public static void main(String[] args) {
        // Establish initial locals
        byte[] array = new byte[1000];
        int index = 0;
        
        // Create first jump target (will be append_frame)
        if (array[index] == 0) {
            array[index] = 1;
        }
        
        // Now create a HUGE amount of straight-line code (no loops, no new variables)
        // This prevents the compiler from adding intermediate StackMapTable entries
        
        // 200+ array operations without any control flow
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        array[index] = (byte)(array[index] + 1);
        
        // After 400+ bytecode instructions of straight-line code,
        // this jump target should require same_frame_extended
        // since locals haven't changed (still String[], byte[], int)
        if (array[index] > 50) {
            System.out.println("High value reached");
        }
        
        System.out.println("Done");
    }
}
