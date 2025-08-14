# Brainfuck JVM Compiler

A Brainfuck-to-JVM bytecode compiler written in Java. This project enables you to compile Brainfuck source code into JVM bytecode, allowing Brainfuck programs to run on the Java Virtual Machine (JVM).

## Features

- Compiles Brainfuck source code to executable JVM `.class` files
- Supports all standard Brainfuck commands (`+`, `-`, `>`, `<`, `[`, `]`, `.`, `,`)
- High performance execution leveraging JVM optimizations
- Command-line interface for compiling and running Brainfuck programs
- Cross-platform: runs anywhere the JVM is available

## Getting Started

### Prerequisites

- Java 8 or higher installed
- (Optional) Maven or Gradle for building from source

### Building

Clone the repository:

```sh
git clone https://github.com/geeksilva97/brainfuck-jvm-compiler.git
cd brainfuck-jvm-compiler
```

Build with Maven:

```sh
mvn package
```

Or with Gradle:

```sh
gradle build
```

### Usage

#### Compile a Brainfuck Program

```sh
java -jar target/brainfuck-jvm-compiler.jar compile hello.bf HelloWorld
```

- `hello.bf`: Path to your Brainfuck source file
- `HelloWorld`: Name for the generated main class

This will produce a `HelloWorld.class` file.

#### Run the Generated Class

```sh
java HelloWorld
```

Or, run Brainfuck code directly:

```sh
java -jar target/brainfuck-jvm-compiler.jar run hello.bf
```

## Examples

Compile and run the classic "Hello, World!":

```sh
java -jar target/brainfuck-jvm-compiler.jar run examples/hello.bf
```

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements, bug fixes, or feature requests.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Made with ❤️ by [geeksilva97](https://github.com/geeksilva97)