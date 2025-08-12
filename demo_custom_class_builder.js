import fs from 'fs';
import { CustomClassBuilder } from './custom_class_builder.js'; // Adjust path as needed

// Create the class builder
const builder = new CustomClassBuilder();

// First, we need to add a string constant for our message
// We'll do this by extending the setupBaseConstants or adding it manually
builder.initClass('LoopMessage');

// Add string constant for our message
const messageStringIndex = builder.addUtf8Constant("Hello from loop iteration!\n");
const messageConstantIndex = builder.addStringConstant(messageStringIndex);

// Add println method for strings
const printlnStringNameIndex = builder.addUtf8Constant("println");
const printlnStringDescriptorIndex = builder.addUtf8Constant("(Ljava/lang/String;)V");
const printlnStringNameAndTypeIndex = builder.addNameAndTypeConstant(
  printlnStringNameIndex, 
  printlnStringDescriptorIndex
);
const printlnStringMethodrefIndex = builder.addMethodrefConstant(
  builder.printStreamClassIndex, 
  printlnStringNameAndTypeIndex
);

const classFile = builder
  .setLimits(3, 3) // max_stack=3, max_locals=3 (args array + counter + temp)
  
  // Initialize counter: int counter = 5;
  .addInstruction('ICONST_5')        // Push 5 onto stack
  .addInstruction('ISTORE_1')        // Store in local variable 1 (counter)
  
  // Loop start label
  .addLabel('loop_start')
  
  // Check if counter == 0, if so, exit loop
  .addInstruction('ILOAD_1')         // Load counter
  .addJump('IFEQ', 'loop_end')       // Jump to loop_end if counter == 0
  
  // Print the message: System.out.println("Hello from loop iteration!");
  .addInstruction('GETSTATIC', builder.outFieldrefIndex)  // Get System.out
  .addInstruction('LDC', messageConstantIndex)            // Load string constant
  .addInstruction('INVOKEVIRTUAL', printlnStringMethodrefIndex) // Call println(String)
  
  // Decrement counter: counter--
  .addInstruction('ILOAD_1')         // Load counter
  .addInstruction('ICONST_1')        // Push 1
  .addInstruction('ISUB')            // Subtract: counter - 1
  .addInstruction('ISTORE_1')        // Store back to counter
  
  // Jump back to loop start
  .addJump('GOTO', 'loop_start')
  
  // Loop end label
  .addLabel('loop_end')
  
  // Return from main method
  .addInstruction('RETURN')
  
  // Build the class
  .build();

// Save the class file
fs.writeFileSync('LoopMessage.class', classFile);
console.log('LoopMessage.class generated successfully!');

// To test it, you can run: java LoopMessage
console.log('To run: java LoopMessage');
