
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
