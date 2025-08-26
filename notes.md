
implementation of invokevirtual

https://github.com/openjdk/jdk/blob/45b7c748737f38c33c4666d17101b051b2fbe2ae/src/java.xml/share/classes/com/sun/org/apache/bcel/internal/generic/INVOKEVIRTUAL.java#L40
https://github.com/openjdk/jdk/blob/45b7c748737f38c33c4666d17101b051b2fbe2ae/test/hotspot/jtreg/testlibrary/asm/org/objectweb/asm/commons/InstructionAdapter.java

PrintStream => https://github.com/openjdk/jdk/blob/45b7c748737f38c33c4666d17101b051b2fbe2ae/src/java.base/share/classes/java/io/PrintStream.java#L837

A classe prinstream fica num binario precopmilado. usando verbose vemos que a classe vem desse shared

`java -verbose:class Brainfuck`

[0,057s][info][class,load] java.io.PrintStream source: shared objects file

ainda é possivel inspecionala

```
javap --module java.base java.io.PrintStream
```

Para encontra a localização do java podemo executar:

```
/usr/libexec/java_home
```
.class bytecode 

https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-4.html

javap -v Hello - comando para printar byte code com constant pool e tudo

---

how to get a single byte

xxd -s <byte_position> -l <how much bytes> BrainfuckProgram.class
xxd -s 274 -l 1 BrainfuckProgram.class


```
xxd -s 270 -l 4 BrainfuckProgram.class
```

to update the code we need to also update the code length

```
00000000: cafe babe 0000 0044 0012 0a00 0200 0307  .......D........
00000010: 0004 0c00 0500 0601 0010 6a61 7661 2f6c  ..........java/l
00000020: 616e 672f 4f62 6a65 6374 0100 063c 696e  ang/Object...<in
00000030: 6974 3e01 0003 2829 5607 0008 0100 1042  it>...()V......B
00000040: 7261 696e 6675 636b 5072 6f67 7261 6d01  rainfuckProgram.
00000050: 0004 436f 6465 0100 0f4c 696e 654e 756d  ..Code...LineNum
00000060: 6265 7254 6162 6c65 0100 046d 6169 6e01  berTable...main.
00000070: 0016 285b 4c6a 6176 612f 6c61 6e67 2f53  ..([Ljava/lang/S
00000080: 7472 696e 673b 2956 0100 0d53 7461 636b  tring;)V...Stack
00000090: 4d61 7054 6162 6c65 0700 0f01 0002 5b49  MapTable......[I
000000a0: 0100 0a53 6f75 7263 6546 696c 6501 0015  ...SourceFile...
000000b0: 4272 6169 6e66 7563 6b50 726f 6772 616d  BrainfuckProgram
000000c0: 2e6a 6176 6100 2100 0700 0200 0000 0000  .java.!.........
000000d0: 0200 0100 0500 0600 0100 0900 0000 1d00  ................
000000e0: 0100 0100 0000 052a b700 01b1 0000 0001  .......*........
000000f0: 000a 0000 0006 0001 0000 0001 0009 000b  ................
00000100: 000c 0001 0009 0000 0075 0004 0003 0000  .........u......
00000110: 002d 1175 30bc 0a4c 033d 2b1c 5c2e 0860  .-.u0..L.=+.\..`
00000120: 4f2b 1c2e 9900 1a84 02ff 2b1c 5c2e 0460  O+........+.\..`
00000130: 4f84 0201 2b1c 5c2e 0464 4fa7 ffe6 b100  O...+.\..dO.....
00000140: 0000 0200 0a00 0000 2600 0900 0000 0300  ........&.......
00000150: 0600 0400 0800 0700 0f00 0a00 1500 0c00  ................
00000160: 1800 0f00 1f00 1200 2200 1500 2c00 1800  ........"...,...
00000170: 0d00 0000 0a00 02fd 000f 0700 0e01 1c00  ................
00000180: 0100 1000 0000 0200 11                   .........
```

- update code length
- `<init>` starts at 0xe6
- add the instructions in the beggining of the code in byte 0x112
- shift attributes by the size of the instructions

- instructions to add (3 bytes)
    - bipush 42 (0x102a)
    - pop (0x57)

I was able to change the .class but it messed with constant pool i guess?

when running `javap -b BrainfuckProgram_modified.class`

```
Warning: File ./BrainfuckProgram_modified.class does not contain class BrainfuckProgram_modified
Classfile /Users/edy/projects/brainfuck-jvm-compiler/BrainfuckProgram_modified.class
  Last modified Aug 12, 2025; size 396 bytes
  SHA-256 checksum 9483d73e652d0a5e10aa6d6a6a4d5ccf53864347fc2dd6f8003a17a900f150a6
Error: error while reading constant pool for BrainfuckProgram_modified: Bad CP index: 7168
```

I realized this is a problem in the attributes parsing, after the methods

In the original class `BrainfuckProgram.class`

```
{ attributesCount: 1 }
{
  attributeNameIndex: 16,
  attributeLength: 2,
  attributeBytes: <Buffer 00 11>
}
```

In the modified it is 

```
{ attributesCount: 3585 }
{
  attributeNameIndex: 7168,
  attributeLength: 16781312,
  attributeBytes: <Buffer 00 00 02 00 11 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 ... 16781262 more bytes>
}
```

hmmmm i need to update `codeLength` too. in both it is 117 but i think in the `modified` it should be 120??
    in fact i needed to adjust the Code `attributeLength` as well, not only codeLength

---

got such a nice idea from chatgpt 

first, the parts of the jvm cod

### memory allocation

```
sipush 30000   // push size
newarray byte  // create new byte[]
astore_1       // store in local var 1 (we'll call this memory)
iconst_0       // push int 0
istore_2       // store in local var 2 (we'll call this head/cell index)
```

`local_1` will be our memory and `local_2` will be the head

### increment n

```
aload_1         // load memory array
iload_2         // load cell index
dup2            // duplicate (arrayref, index) because iaload consumes both
baload          // load byte value (sign-extended to int)
sipush n        // push n (or bipush/sipush for larger n)
iadd            // add
i2b             // convert back to byte
bastore         // store back into array
```

### move_head h

```
sipush h   // or bipush h, sipush h
istore_2   // stores in head (local_2)
```

### jump_eqz pc

```
aload_1
iload_2
baload
ifeq <target_pc>
```

### jump_neqz pc

```
aload_1 // loading array reference (local_1)
iload_2 // loading head (local_2)
baload // get valye from cells[head]
ifeq <target_pc> // is zero, goes to the target_pc instruction
```

### input

```
getstatic java/lang/System/in Ljava/io/InputStream;
invokevirtual java/io/InputStream/read()I
i2b
aload_1
iload_2
swap
bastore
```

aload_1 comes before iload_2 because bastore needs the following structure on the stack:

    arrayref
    index
    value

that's also why it has a swap

actually... i think don't need the swap at all

### output

```
getstatic java/lang/System/out Ljava/io/PrintStream;
aload_1
iload_2
baload
invokevirtual java/io/PrintStream/print(I)V
```


---

I was able to update the class--generator and add code to it.

but when running:

    java CompiledBrainfuck
    Error: Unable to initialize main class CompiledBrainfuck
    Caused by: java.lang.VerifyError: Local variable table overflow
    Exception Details:
    Location:
        CompiledBrainfuck.main([Ljava/lang/String;)V @5: astore_1
    Reason:
        Local index 1 is invalid
    Bytecode:
        0000000: 1175 30bc 084c 033d b1

I think it's due to the locals, so far it's it 1 but i am creating two variables.

yes, i increased `locals` to `4` and it worked (i think 2 is good enough, need to check)


I could reduce it to 2 since I only have two variables. 

I made some experiments with the same index like (`istore_0` and `aload_0`)

    Caused by: java.lang.VerifyError: Bad type on operand stack
    Exception Details:
    Location:
        CompiledBrainfuck.main([Ljava/lang/String;)V @7: astore
    Reason:
        Type integer (current frame, stack[0]) is not assignable to reference type
    Current Frame:
        bci: @7
        flags: { }
        locals: { '[B' }
        stack: { integer }
    Bytecode:
        0000000: 1175 30bc 084b 033a b1

I guess this is because I am trying to save something of a different type in the same slot

slot 0 has an array and I am now trying to store an integer

I had to turn it back to astore_1 and istore_2. Seems like the slot 0 is for method args


Just learned if i compile with `javac -g:vars BrainfuckProgram.java` it adds the LocalVariableTable attribute

    LocalVariableTable:
            Start  Length  Slot  Name   Signature
                0      45     0  args   [Ljava/lang/String;
                6      39     1 cells   [I
                8      37     2 pointer   I

Indeed, args ocuppies slot 0


---

Got this error

    Error: Unable to initialize main class CompiledBrainfuck
    Caused by: java.lang.VerifyError: Bad type on operand stack
    Exception Details:
    Location:
        CompiledBrainfuck.main([Ljava/lang/String;)V @11: invokevirtual
    Reason:
        Type 'java/io/InputStream' (current frame, stack[0]) is not assignable to 'java/lang/String'
    Current Frame:
        bci: @11
        flags: { }
        locals: { '[Ljava/lang/String;', '[B', integer }
        stack: { 'java/io/InputStream' }
    Bytecode:
        0000000: 1175 30bc 084c 033d b200 18b6 001b b1

The descriptor of the read method is incorrect. It should be `()I`

for the output we wanna print bytes as char (ASCII) that is how the brainfuck spec ascs us to do

It means the `System.out.println` descriptor should then be `(C)V`: taking a `char` instead of a `String`


If a method returns anything this is added to the stack

https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-6.html#jvms-6.5.bastore


---

okay, one more error after implementing jumps

    Error: Unable to initialize main class Brainjuck
    Caused by: java.lang.VerifyError: Expecting a stackmap frame at branch target 107
    Exception Details:
    Location:
        Brainjuck.main([Ljava/lang/String;)V @35: ifeq
    Reason:
        Expected stackmap frame at this location.
    Bytecode:
        0000000: 1175 30bc 084c 033d 2b1c 5c33 1100 0260
        0000010: 9154 1100 013d 2b1c 5c33 1100 0560 9154
        0000020: 2b1c 3399 0048 1100 003d 2b1c 5c33 1100
        0000030: 0160 9154 1100 013d 2b1c 5c33 11ff ff60
        0000040: 9154 2b1c 339a 0026 b1

the bytecode had something like

    Error: Bytecode offset out of range; bci=107, codeLength=73
        35: ifeq          ???
    Error: Bytecode offset out of range; bci=107, codeLength=73
        69: ifne          ???

some error messages andn `???` in the jump instructions

For a test i set jump pc to zero and it turned into

    35: ifeq          35
    69: ifne          69

notice how it keeps the same line

that's interesting. seems like the pc should be an offset



Now i fixed the offset thing. When running i keep getting the error: 
    Caused by: java.lang.VerifyError: Expecting a stackmap frame at branch target 107

well we can bypass verification and ssems like it works!

`java -noverify Brainjuck`

but a proper way to handle this is to add the StackMap frame

    Option 1: Add Stack Map Frames (Complex)
    You'd need to generate StackMapTable attributes in your class file, which is quite complex to implement correctly.

I will check how to add a stack frame in another day

for now i will be executing it with 

```bash
java -XX:+IgnoreUnrecognizedVMOptions -noverify Brainjuck
```

With that i can skip the verification and supress any warning


Can generate some nice texts using: https://copy.sh/brainfuck/text.html


---

Gotta try adding the stack map frame

it's a bit weird how things work

Frame Type Categories
The JVM spec defines different frame types based on what changes between frames:

0-63: same_frame - nothing changed
64-127: same_locals_1_stack_item_frame - stack has 1 item, locals unchanged
128-246: Reserved
247: same_locals_1_stack_item_frame_extended
248-250: chop_frame - remove 1-3 locals
251: same_frame_extended
252-254: append_frame - add 1-3 locals
255: full_frame - specify everything explicitly

In brainfuck we have two local variables (the memory array and the pointer). So, when we do jumps, the locals remain the
same

I think the first one is an append_frame

```Frame Type: 253 (append_frame)
Offset Delta: 0
Locals:
  [B (array of bytes)
  I (int)
Stack:
```

253 since we have 2 locals and the base is 251

all the other frames are the same

```Frame Type: 0 (same_frame)
Offset Delta: X
```


I think i got an idea

```
  public static void main(java.lang.String[]) throws java.io.IOException;
    descriptor: ([Ljava/lang/String;)V
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
    Code:
      stack=2, locals=2, args_size=1
         0: iconst_3
         1: istore_1
         2: iload_1
         3: iconst_2
         4: irem
         5: iconst_1
         6: if_icmpne     20 (offset 14)
         9: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
        12: ldc           #13                 // String 3 is odd
        14: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        17: goto          28 (offset 11)
        20: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
        23: ldc           #21                 // String 3 is even
        25: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        28: iload_1
        29: iconst_2
        30: irem
        31: ifne          45 (offset 14)
        34: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
        37: ldc           #23                 // String 4 is odd
        39: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        42: goto          53 (offset 11)
        45: getstatic     #7                  // Field java/lang/System.out:Ljava/io/PrintStream;
        48: ldc           #25                 // String 4 is even
        50: invokevirtual #15                 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
        53: return
      LineNumberTable:
        line 5: 0
        line 6: 2
        line 7: 9
        line 9: 20
        line 12: 28
        line 13: 34
        line 15: 45
        line 32: 53
      StackMapTable: number_of_entries = 4 (number of jumps)
        frame_type = 252 /* append */ (k = frame_type - 251) -> (frame_type = k + 251)
          offset_delta = 20 (first frame, offset is as is)
          locals = [ int ] (number of locals added from the previous frame, this is what "k" is )
        frame_type = 7 /* same */ -> (offset_delta = frame_type) -> (jump_offset - 1 - previous_offset) - jump_offset is the calculated offset in the instructions
                                    (28 - 1 - 20) -> 7
        frame_type = 16 /* same */ (45 - 1 - 28) -> 16
        frame_type = 7 /* same */ (53 - 1 - 45) -> 7
    Exceptions:
      throws java.io.IOException
}
```

zooming in


      StackMapTable: number_of_entries = 4 (number of jumps)
        frame_type = 252 /* append */ (k = frame_type - 251) -> (frame_type = k + 251)
          offset_delta = 20 (first frame, offset is as is)
          locals = [ int ] (number of locals added from the previous frame, this is what "k" is )
        frame_type = 7 /* same */ -> (offset_delta = frame_type) -> (jump_offset - 1 - previous_offset) - jump_offset is the calculated offset in the instructions
                                    (28 - 1 - 20) -> 7
        frame_type = 16 /* same */ (45 - 1 - 28) -> 16
        frame_type = 7 /* same */ (53 - 1 - 45) -> 7


    Each value of the attributes table must be an attribute structure (§4.7). A Code attribute can have any number of optional attributes associated with it.

    The only attributes defined by this specification as appearing in the attributes table of a Code attribute are the LineNumberTable (§4.7.12), LocalVariableTable (§4.7.13), LocalVariableTypeTable (§4.7.14), and StackMapTable (§4.7.4) attributes.

    If a Java Virtual Machine implementation recognizes class files whose version number is 50.0 or above, it must recognize and correctly read StackMapTable (§4.7.4) attributes found in the attributes table of a Code attribute of a class file whose version number is 50.0 or above.

----
  public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
    Code:
      stack=4, locals=3, args_size=1
         0: sipush        30000
         3: newarray       byte
         5: astore_1
         6: iconst_0
         7: istore_2
         8: aload_1
         9: iload_2
        10: aload_1
        11: iload_2
        12: baload
        13: iconst_1
        14: iadd
        15: i2b
        16: bastore
        17: aload_1
        18: iload_2
        19: aload_1
        20: iload_2
        21: baload
        22: iconst_1
        23: iadd
        24: i2b
        25: bastore
        26: aload_1
        27: iload_2
        28: aload_1
        29: iload_2
        30: baload
        31: iconst_1
        32: iadd
        33: i2b
        34: bastore
        35: aload_1
        36: iload_2
        37: baload
        38: ifeq          53
        41: aload_1
        42: iload_2
        43: aload_1
        44: iload_2
        45: baload
        46: iconst_1
        47: isub
        48: i2b
        49: bastore
        50: goto          35
        53: return
      StackMapTable: number_of_entries = 2
        frame_type = 253 /* append */
          offset_delta = 35
          locals = [ class "[B", int ]
        frame_type = 17 /* same */



order is different... is this allowed?

StackMapTable must be sorted by increasing offset. Among the targets {2,14}, the smallest is 2, so it comes firs


---- 

it works for same freame but breaks for same frame extended


BELOW WORKS!!

Computing StackMapTable {
  stackMapTable: [
    { targetPc: 24, offsetDelta: 24, frameType: 253, locals: [Array] },
    { targetPc: 58, offsetDelta: 33 }
  ],
  buf: <Buffer 00 13 00 00 00 0a 00 02 fd 00 18 07 00 15 01 21>,
  bufLen: 16
}

Let's take `00 13 00 00 00 0a 00 02 fd 00 18 07 00 15 01 21`

- `00 13` is the entry to the constant pool that has the constant `StackMapTable`
- `00 00 00 0a` is the attribute length (10 bytes)
- `00 02 fd 00 18 07 00 15 01 21` notice this has 10 as expected

----

BELOW FAILS|

Computing StackMapTable {
  stackMapTable: [
    { targetPc: 24, offsetDelta: 24, frameType: 253, locals: [Array] },
    { targetPc: 58, offsetDelta: 33 },
    { targetPc: 98, offsetDelta: 64, frameType: 251 },
    { targetPc: 132, offsetDelta: 67, frameType: 251 }
  ],
  buf: <Buffer 00 13 00 00 00 12 00 04 fd 00 18 07 00 15 01 21 fb 00 40 fb 00 43>,
  bufLen: 22
}

I think is has to do with the mismatching length

Let's take `00 13 00 00 00 12 00 04 fd 00 18 07 00 15 01 21 fb 00 40 fb 00 43`

- `00 13` is the entry to the constant pool that has the constant `StackMapTable`
- `00 00 00 12` is the attribute length (18 bytes)
- `00 04 fd 00 18 07 00 15 01 21 fb 00 40 fb 00 43` notice this has 16 bytes not the 18 bytes we expected

this calculation was incorrect because i was summing the number of entries to the length of the buffer. it should be
2 + buffer.length;

my reasoning about the frames was correct but the implementation was incorrect. Claude was able to fix it
