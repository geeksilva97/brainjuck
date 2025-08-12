
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
