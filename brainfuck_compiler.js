import fs from 'node:fs';
import { ClassFileGenerator } from './class_generator.js';

class BrainfuckCompiler extends ClassFileGenerator {
  compileIR(irInstructions, className = 'BrainfuckProgram') {
    this.buffer = [];
    this.constantPool = [];
    this.constantPoolMap.clear();

    // Set up constants for the runtime
    this.setupConstants(className);

    // Generate class structure
    this.generateClassStructure(className);

    // Generate main method with Brainfuck logic
    this.generateMainMethod(irInstructions);

    return new Uint8Array(this.buffer);
  }

  generateClassStructure(className) {
    // Write ClassFile structure

    // Magic number
    this.writeU4(0xCAFEBABE);

    // Version (Java 8 = 52.0)
    this.writeU2(0); // minor_version
    this.writeU2(52); // major_version

    // Constant pool
    this.writeConstantPool();

    // Access flags (public)
    this.writeU2(0x0021); // ACC_PUBLIC | ACC_SUPER

    // This class
    this.writeU2(this.thisClassIndex);

    // Super class
    this.writeU2(this.objectClassIndex);

    // Interfaces
    this.writeU2(0); // interfaces_count

    // Fields
    this.writeU2(0); // fields_count

    // Methods (constructor + main)
    this.writeU2(2); // methods_count

    // Generate constructor
    this.generateConstructor();

    // Note: The main method will be generated separately by generateMainMethod()
    // We're just setting up the method header here
    this.generateMainMethodHeader();
  }

  generateConstructor() {
    // Constructor method signature constants
    const constructorNameIndex = this.addUtf8Constant("<init>");
    const constructorDescriptorIndex = this.addUtf8Constant("()V");
    const codeNameIndex = this.addUtf8Constant("Code");

    // Constructor method reference to Object.<init>
    const constructorNameAndTypeIndex = this.addNameAndTypeConstant(constructorNameIndex, constructorDescriptorIndex);
    const constructorMethodrefIndex = this.addMethodrefConstant(this.objectClassIndex, constructorNameAndTypeIndex);

    // Constructor method
    this.writeU2(0x0001); // ACC_PUBLIC
    this.writeU2(constructorNameIndex); // name_index
    this.writeU2(constructorDescriptorIndex); // descriptor_index
    this.writeU2(1); // attributes_count

    // Constructor Code attribute
    this.writeU2(codeNameIndex); // attribute_name_index
    this.writeU4(17); // attribute_length
    this.writeU2(1); // max_stack
    this.writeU2(1); // max_locals
    this.writeU4(5); // code_length

    // Constructor bytecode: aload_0, invokespecial Object.<init>, return
    this.addInstruction('ALOAD_0');
    this.addInstruction('INVOKESPECIAL', constructorMethodrefIndex);
    this.addInstruction('RETURN');

    this.writeU2(0); // exception_table_length
    this.writeU2(0); // attributes_count
  }

  generateMainMethodHeader() {
    // Main method signature constants
    const mainNameIndex = this.addUtf8Constant("main");
    const mainDescriptorIndex = this.addUtf8Constant("([Ljava/lang/String;)V");
    const codeNameIndex = this.addUtf8Constant("Code");

    // Main method
    this.writeU2(0x0009); // ACC_PUBLIC | ACC_STATIC
    this.writeU2(mainNameIndex); // name_index
    this.writeU2(mainDescriptorIndex); // descriptor_index
    this.writeU2(1); // attributes_count

    // We need to calculate the actual code length after generating the bytecode
    // So we'll store the position where we need to write the attribute_length
    this.codeAttributeLengthPosition = this.buffer.length;

    this.writeU2(codeNameIndex); // attribute_name_index
    this.writeU4(0); // attribute_length - will be filled in later
    this.writeU2(5); // max_stack (conservative estimate)
    this.writeU2(10); // max_locals (array, pointer, method args, etc.)

    // Store position where we need to write code_length
    this.codeLengthPosition = this.buffer.length;
    this.writeU4(0); // code_length - will be filled in later

    // Store the start position of the actual bytecode
    this.codeStartPosition = this.buffer.length;
  }

  // This method should be called after generateMainMethod() to finalize the method
  finalizeMainMethod() {
    const codeEndPosition = this.buffer.length;
    const actualCodeLength = codeEndPosition - this.codeStartPosition;

    // Update the code_length field
    const codeLengthBytes = [
      (actualCodeLength >> 24) & 0xFF,
      (actualCodeLength >> 16) & 0xFF,
      (actualCodeLength >> 8) & 0xFF,
      actualCodeLength & 0xFF
    ];

    for (let i = 0; i < 4; i++) {
      this.buffer[this.codeLengthPosition + i] = codeLengthBytes[i];
    }

    // Write exception table and method attributes
    this.writeU2(0); // exception_table_length
    this.writeU2(0); // method attributes_count

    // Calculate and update the Code attribute length
    const finalPosition = this.buffer.length;
    const attributeLength = finalPosition - this.codeAttributeLengthPosition - 6; // 6 = attribute_name_index(2) + attribute_length(4)

    const attributeLengthBytes = [
      (attributeLength >> 24) & 0xFF,
      (attributeLength >> 16) & 0xFF,
      (attributeLength >> 8) & 0xFF,
      attributeLength & 0xFF
    ];

    for (let i = 0; i < 4; i++) {
      this.buffer[this.codeAttributeLengthPosition + 2 + i] = attributeLengthBytes[i];
    }

    // Write class attributes
    this.writeU2(0); // class attributes_count
  }

  setupConstants(className) {
    // Basic class constants
    this.objectClassIndex = this.addClassConstant(this.addUtf8Constant("java/lang/Object"));
    this.thisClassIndex = this.addClassConstant(this.addUtf8Constant(className));

    // System.out constants
    this.systemClassIndex = this.addClassConstant(this.addUtf8Constant("java/lang/System"));
    this.printStreamClassIndex = this.addClassConstant(this.addUtf8Constant("java/io/PrintStream"));
    this.outFieldIndex = this.addFieldrefConstant(
      this.systemClassIndex,
      this.addNameAndTypeConstant(
        this.addUtf8Constant("out"),
        this.addUtf8Constant("Ljava/io/PrintStream;")
      )
    );

    // System.in constants  
    this.inputStreamClassIndex = this.addClassConstant(this.addUtf8Constant("java/io/InputStream"));
    this.inFieldIndex = this.addFieldrefConstant(
      this.systemClassIndex,
      this.addNameAndTypeConstant(
        this.addUtf8Constant("in"),
        this.addUtf8Constant("Ljava/io/InputStream;")
      )
    );

    // Method references
    this.printCharMethodIndex = this.addMethodrefConstant(
      this.printStreamClassIndex,
      this.addNameAndTypeConstant(
        this.addUtf8Constant("print"),
        this.addUtf8Constant("(C)V")
      )
    );

    this.readMethodIndex = this.addMethodrefConstant(
      this.inputStreamClassIndex,
      this.addNameAndTypeConstant(
        this.addUtf8Constant("read"),
        this.addUtf8Constant("()I")
      )
    );
  }

  generateMainMethod(irInstructions) {
    // Calculate labels for jumps
    const labels = this.calculateLabels(irInstructions);

    // Start building the method bytecode
    const methodBytecode = [];

    // Initialize memory array: int[] cells = new int[30000];
    this.addInstruction('SIPUSH', 30000);
    this.addInstruction('NEWARRAY', 10); // T_INT = 10
    this.addInstruction('ASTORE_1'); // Store array in local var 1

    // Initialize pointer: int pointer = 0;
    this.addInstruction('ICONST_0');
    this.addInstruction('ISTORE_2'); // Store pointer in local var 2

    // Process each IR instruction
    for (let i = 0; i < irInstructions.length; i++) {
      const instr = irInstructions[i];

      // Place label if this instruction is a jump target
      if (labels[i]) {
        // Mark current position for jumps
      }

      switch (instr.type) {
        case 'increment':
          this.generateIncrement(instr.value);
          break;
        case 'move_head':
          this.generateMoveHead(instr.value);
          break;
        case 'jump_zero':
          this.generateJumpZero(labels[instr.target]);
          break;
        case 'jump_nero':
          this.generateJumpNero(labels[instr.target]);
          break;
        case 'input':
          this.generateInput();
          break;
        case 'output':
          this.generateOutput();
          break;
      }
    }

    this.addInstruction('RETURN');
  }

  generateIncrement(n) {
    // cells[pointer] += n
    this.addInstruction('ALOAD_1');      // Load cells array
    this.addInstruction('ILOAD_2');      // Load pointer
    this.addInstruction('DUP2');         // Duplicate array ref and index for later store
    this.addInstruction('IALOAD');       // Load cells[pointer]

    if (n >= -128 && n <= 127) {
      this.addInstruction('BIPUSH', n);
    } else {
      this.addInstruction('SIPUSH', n);
    }

    this.addInstruction('IADD');         // Add n to current value
    this.addInstruction('IASTORE');      // Store back to cells[pointer]
  }

  generateMoveHead(h) {
    // pointer = h
    if (h >= -128 && h <= 127) {
      this.addInstruction('BIPUSH', h);
    } else {
      this.addInstruction('SIPUSH', h);
    }
    this.addInstruction('ISTORE_2');     // Store new pointer value
  }

  generateJumpZero(labelOffset) {
    // if (cells[pointer] == 0) goto label
    this.addInstruction('ALOAD_1');      // Load cells array
    this.addInstruction('ILOAD_2');      // Load pointer  
    this.addInstruction('IALOAD');       // Load cells[pointer]
    this.addInstruction('IFEQ', labelOffset); // Jump if zero
  }

  generateJumpNero(labelOffset) {
    // if (cells[pointer] != 0) goto label
    this.addInstruction('ALOAD_1');      // Load cells array
    this.addInstruction('ILOAD_2');      // Load pointer
    this.addInstruction('IALOAD');       // Load cells[pointer]
    this.addInstruction('IFNE', labelOffset); // Jump if not zero
  }

  generateInput() {
    // cells[pointer] = System.in.read()
    this.addInstruction('ALOAD_1');      // Load cells array
    this.addInstruction('ILOAD_2');      // Load pointer
    this.addInstruction('GETSTATIC', this.inFieldIndex); // Get System.in
    this.addInstruction('INVOKEVIRTUAL', this.readMethodIndex); // Call read()
    this.addInstruction('IASTORE');      // Store to cells[pointer]
  }

  generateOutput() {
    // System.out.print((char)cells[pointer])
    this.addInstruction('GETSTATIC', this.outFieldIndex); // Get System.out
    this.addInstruction('ALOAD_1');      // Load cells array
    this.addInstruction('ILOAD_2');      // Load pointer
    this.addInstruction('IALOAD');       // Load cells[pointer]
    this.addInstruction('I2C');          // Convert int to char
    this.addInstruction('INVOKEVIRTUAL', this.printCharMethodIndex); // Call print(char)
  }

  calculateLabels(irInstructions) {
    // Pre-calculate jump targets and their bytecode offsets
    // This is complex because you need to know the final bytecode size
    // A two-pass approach works best: first pass calculates rough positions,
    // second pass generates final bytecode with correct offsets
    const labels = {};
    // ... implementation details
    return labels;
  }
}

const irProgram = [
  { type: 'increment', value: 72 },    // 'H'
  { type: 'output' },
  { type: 'increment', value: 29 },    // 'e' (72 + 29 = 101)
  { type: 'output' },
  // ... more instructions
];

const compiler = new BrainfuckCompiler();
const classFile = compiler.compileIR(irProgram, 'HelloWorld');
fs.writeFileSync('HelloWorld.class', classFile);
