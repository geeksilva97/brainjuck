import { ClassFileGenerator } from './class_generator.js';

export class CustomClassBuilder extends ClassFileGenerator {
  constructor() {
    super();
    this.instructions = [];
    this.maxStack = 2;
    this.maxLocals = 10;
    this.labels = new Map();
    this.labelReferences = [];
  }

  // Initialize a new class with basic structure
  initClass(className = 'CustomClass') {
    this.buffer = [];
    this.constantPool = [];
    this.constantPoolMap.clear();
    this.instructions = [];
    this.labels.clear();
    this.labelReferences = [];

    this.className = className;

    // Set up basic constants that are commonly needed
    this.setupBaseConstants(className);

    return this;
  }

  setupBaseConstants(className) {
    // Basic class hierarchy
    this.objectClassNameIndex = this.addUtf8Constant("java/lang/Object");
    this.objectClassIndex = this.addClassConstant(this.objectClassNameIndex);

    this.classNameIndex = this.addUtf8Constant(className);
    this.thisClassIndex = this.addClassConstant(this.classNameIndex);

    // Method names and descriptors
    this.constructorNameIndex = this.addUtf8Constant("<init>");
    this.constructorDescriptorIndex = this.addUtf8Constant("()V");
    this.mainNameIndex = this.addUtf8Constant("main");
    this.mainDescriptorIndex = this.addUtf8Constant("([Ljava/lang/String;)V");
    this.codeNameIndex = this.addUtf8Constant("Code");

    // Constructor method reference
    this.constructorNameAndTypeIndex = this.addNameAndTypeConstant(
      this.constructorNameIndex,
      this.constructorDescriptorIndex
    );
    this.constructorMethodrefIndex = this.addMethodrefConstant(
      this.objectClassIndex,
      this.constructorNameAndTypeIndex
    );

    // Common System classes
    this.systemClassNameIndex = this.addUtf8Constant("java/lang/System");
    this.systemClassIndex = this.addClassConstant(this.systemClassNameIndex);

    this.printStreamClassNameIndex = this.addUtf8Constant("java/io/PrintStream");
    this.printStreamClassIndex = this.addClassConstant(this.printStreamClassNameIndex);

    // System.out field
    this.outFieldNameIndex = this.addUtf8Constant("out");
    this.printStreamDescriptorIndex = this.addUtf8Constant("Ljava/io/PrintStream;");
    this.outNameAndTypeIndex = this.addNameAndTypeConstant(
      this.outFieldNameIndex,
      this.printStreamDescriptorIndex
    );
    this.outFieldrefIndex = this.addFieldrefConstant(
      this.systemClassIndex,
      this.outNameAndTypeIndex
    );
  }

  // Add an instruction to the main method
  addInstruction(opcode, ...operands) {
    this.instructions.push({ opcode, operands });
    return this;
  }

  // Add a label at the current position
  addLabel(labelName) {
    this.labels.set(labelName, this.instructions.length);
    return this;
  }

  // Add a jump instruction that references a label
  addJump(opcode, labelName) {
    this.labelReferences.push({
      instructionIndex: this.instructions.length,
      labelName: labelName,
      opcode: opcode
    });
    this.instructions.push({ opcode, operands: [0] }); // Placeholder offset
    return this;
  }

  // Set stack and locals limits
  setLimits(maxStack, maxLocals) {
    this.maxStack = maxStack;
    this.maxLocals = maxLocals;
    return this;
  }

  // Build the complete class
  build() {
    // Write class file header
    this.writeClassHeader();

    // Write constructor
    this.writeConstructor();

    // Write main method
    this.writeMainMethod();

    // Write class attributes
    this.writeU2(0); // attributes_count

    return new Uint8Array(this.buffer);
  }

  writeClassHeader() {
    // Magic number and version
    this.writeU4(0xCAFEBABE);
    this.writeU2(0); // minor_version
    this.writeU2(52); // major_version (Java 8)

    // Constant pool
    this.writeConstantPool();

    // Access flags, class hierarchy
    this.writeU2(0x0021); // ACC_PUBLIC | ACC_SUPER
    this.writeU2(this.thisClassIndex);
    this.writeU2(this.objectClassIndex);
    this.writeU2(0); // interfaces_count
    this.writeU2(0); // fields_count
    this.writeU2(2); // methods_count (constructor + main)
  }

  writeConstructor() {
    this.writeU2(0x0001); // ACC_PUBLIC
    this.writeU2(this.constructorNameIndex);
    this.writeU2(this.constructorDescriptorIndex);
    this.writeU2(1); // attributes_count

    // Code attribute
    this.writeU2(this.codeNameIndex);
    this.writeU4(17); // attribute_length
    this.writeU2(1); // max_stack
    this.writeU2(1); // max_locals
    this.writeU4(5); // code_length

    // Constructor bytecode
    this.writeU1(0x2A); // aload_0
    this.writeU1(0xB7); // invokespecial
    this.writeU2(this.constructorMethodrefIndex);
    this.writeU1(0xB1); // return

    this.writeU2(0); // exception_table_length
    this.writeU2(0); // attributes_count
  }

  writeMainMethod() {
    this.writeU2(0x0009); // ACC_PUBLIC | ACC_STATIC
    this.writeU2(this.mainNameIndex);
    this.writeU2(this.mainDescriptorIndex);
    this.writeU2(1); // attributes_count

    // Generate bytecode for instructions
    const bytecode = this.generateBytecode();

    // Code attribute
    this.writeU2(this.codeNameIndex);
    this.writeU4(12 + bytecode.length); // attribute_length
    this.writeU2(this.maxStack);
    this.writeU2(this.maxLocals);
    this.writeU4(bytecode.length);

    // Write the actual bytecode
    this.writeBytes(bytecode);

    this.writeU2(0); // exception_table_length
    this.writeU2(0); // attributes_count
  }

  generateBytecode() {
    const bytecodeBuffer = [];

    // First pass: calculate label positions
    const labelPositions = new Map();
    let currentPosition = 0;

    for (let i = 0; i < this.instructions.length; i++) {
      // Check if there's a label at this position
      for (const [labelName, labelIndex] of this.labels) {
        if (labelIndex === i) {
          labelPositions.set(labelName, currentPosition);
        }
      }

      const instr = this.instructions[i];
      const opcodeSize = this.getInstructionSize(instr.opcode, instr.operands);
      currentPosition += opcodeSize;
    }

    // Second pass: generate bytecode with correct offsets
    currentPosition = 0;

    for (let i = 0; i < this.instructions.length; i++) {
      const instr = this.instructions[i];
      const startPos = bytecodeBuffer.length;

      // Check if this is a label reference
      const labelRef = this.labelReferences.find(ref => ref.instructionIndex === i);
      if (labelRef) {
        const targetPosition = labelPositions.get(labelRef.labelName);
        const offset = targetPosition - currentPosition;

        // Write jump instruction with correct offset
        this.writeInstructionToBytecode(bytecodeBuffer, instr.opcode, offset);
      } else {
        // Write normal instruction
        this.writeInstructionToBytecode(bytecodeBuffer, instr.opcode, ...instr.operands);
      }

      currentPosition += (bytecodeBuffer.length - startPos);
    }

    return bytecodeBuffer;
  }

  getInstructionSize(opcode, operands) {
    if (typeof opcode === 'string') {
      opcode = this.getOpcodeValue(opcode);
    }

    // Most instructions are 1 byte + operands
    let size = 1;

    // Add operand sizes based on instruction type
    switch (opcode) {
      case 0x10: // BIPUSH
      case 0x12: // LDC
        size += 1;
        break;
      case 0x11: // SIPUSH
      case 0x99: case 0x9A: // IFEQ, IFNE
      case 0xA7: // GOTO
      case 0xB2: case 0xB6: // GETSTATIC, INVOKEVIRTUAL
        size += 2;
        break;
      default:
        // Handle operands generically
        for (const operand of operands) {
          if (operand <= 255 && operand >= -128) {
            size += 1;
          } else {
            size += 2;
          }
        }
    }

    return size;
  }

  writeInstructionToBytecode(buffer, opcode, ...operands) {
    // Convert string opcodes to numbers if needed
    if (typeof opcode === 'string') {
      opcode = this.getOpcodeValue(opcode);
    }

    buffer.push(opcode);

    // Handle operands based on instruction type
    switch (opcode) {
      case 0x10: // BIPUSH
      case 0x12: // LDC
        if (operands.length > 0) {
          buffer.push(operands[0] & 0xFF);
        }
        break;
      case 0x11: // SIPUSH
      case 0x99: case 0x9A: // IFEQ, IFNE
      case 0xA7: // GOTO
      case 0xB2: case 0xB6: case 0xB7: // GETSTATIC, INVOKEVIRTUAL, INVOKESPECIAL
        if (operands.length > 0) {
          const value = operands[0];
          buffer.push((value >> 8) & 0xFF);
          buffer.push(value & 0xFF);
        }
        break;
      default:
        // Handle other operands
        for (const operand of operands) {
          if (operand <= 255 && operand >= -128) {
            buffer.push(operand & 0xFF);
          } else {
            buffer.push((operand >> 8) & 0xFF);
            buffer.push(operand & 0xFF);
          }
        }
    }
  }

  getOpcodeValue(opcodeString) {
    const opcodes = {
      'NOP': 0x00,
      'ICONST_0': 0x03, 'ICONST_1': 0x04, 'ICONST_2': 0x05, 'ICONST_3': 0x06, 'ICONST_4': 0x07, 'ICONST_5': 0x08,
      'BIPUSH': 0x10, 'SIPUSH': 0x11, 'LDC': 0x12,
      'ILOAD': 0x15, 'ILOAD_1': 0x1B, 'ILOAD_2': 0x1C,
      'ISTORE': 0x36, 'ISTORE_1': 0x3C, 'ISTORE_2': 0x3D,
      'IADD': 0x60, 'ISUB': 0x64,
      'I2C': 0x92,
      'IFEQ': 0x99, 'IFNE': 0x9A,
      'GOTO': 0xA7,
      'RETURN': 0xB1,
      'GETSTATIC': 0xB2,
      'INVOKEVIRTUAL': 0xB6, 'INVOKESPECIAL': 0xB7
    };

    const upperOpcode = opcodeString.toUpperCase();
    if (opcodes.hasOwnProperty(upperOpcode)) {
      return opcodes[upperOpcode];
    }
    throw new Error(`Unknown opcode string: ${opcodeString}`);
  }
}
