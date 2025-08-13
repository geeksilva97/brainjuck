
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
