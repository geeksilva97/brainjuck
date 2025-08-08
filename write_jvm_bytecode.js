import fs from 'node:fs';

//const MAP = {
//  'CONSTANT_Class': 7,
//  'CONSTANT_Fieldref': 9,
//  'CONSTANT_Methodref': 10,
//  'CONSTANT_InterfaceMethodref': 11,
//  'CONSTANT_String': 8,
//  'CONSTANT_Integer': 3,
//  'CONSTANT_Float': 4,
//  'CONSTANT_Long': 5,
//  'CONSTANT_Double': 6,
//  'CONSTANT_NameAndType': 12,
//  'CONSTANT_Utf8': 1,
//  'CONSTANT_MethodHandle': 15,
//  'CONSTANT_MethodType': 16,
//  'CONSTANT_InvokeDynamic': 18,
//};

//function intToTwoBytes(value) {
//  const highByte = (value >> 8) & 0xFF;  // Get upper 8 bits
//  const lowByte = value & 0xFF;          // Get lower 8 bits
//  return [highByte, lowByte];
//}

//const buffer = [];
//let currentIndexInConstantPool = 0;

//const makeMethodRef = ({ classIndex, nameAndTypeIndex }) => {
//  // CONSTANT_Methodref_info {
//  //     u1 tag;
//  //     u2 class_index;
//  //     u2 name_and_type_index;
//  // }
//  return [++currentIndexInConstantPool, MAP.CONSTANT_Methodref, ...intToTwoBytes(classIndex), ...intToTwoBytes(nameAndTypeIndex)];
//};

//const makeNameAndType = ({ nameIndex, descriptorIndex }) => {
//  //CONSTANT_NameAndType_info {
//  // u1 tag;
//  // u2 name_index;
//  // u2 descriptor_index;
//  // }
//  return [++currentIndexInConstantPool, MAP.CONSTANT_NameAndType, ...intToTwoBytes(nameIndex), ...intToTwoBytes(descriptorIndex)];
//};

//const makeClass = ({ nameIndex }) => {
//  return [++currentIndexInConstantPool, MAP.CONSTANT_Class, nameIndex];
//};

//const makeUtf8 = ({ text }) => {
//  const t = Buffer.from(text);
//  return [++currentIndexInConstantPool, MAP.CONSTANT_Utf8, t.length, ...t];
//};

//// ----------------------------

//// write magic number
//buffer.push(0xca, 0xfe, 0xba, 0xbe);

//// minor(2) and major()
//buffer.push(0, 0, 0, 0x44);

//// constant pool
//const [mainMethodNameIndex, ...mainmethod] = makeUtf8({ text: "main" });
//const [parentClassNameIndex, ...parentClass] = makeUtf8({ text: "java/lang/Object" });
//const [initMethodNameIndex, ...initMethod] = makeUtf8({ text: "<init>" });
//const [initMethodDescriptorNameIndex, ...initMethodDescriptor] = makeUtf8({ text: "java/lang/Object" });

//buffer.push(0, currentIndexInConstantPool + 1) // number of things in the constant pool plus one
//buffer.push(...mainmethod)
//buffer.push(...parentClass)
//buffer.push(...initMethod)
//buffer.push(...initMethodDescriptor);

//const [nameAndTypeIndex, ...nameAndType] = makeNameAndType({ nameIndex: initMethodNameIndex, descriptorIndex: initMethodDescriptorNameIndex });
//buffer.push(...nameAndType);

//const [methodRefIndex, ...methodRef] = makeMethodRef({ nameAndTypeIndex, classIndex: parentClassNameIndex });
//buffer.push(...methodRef);

//console.log({ nameAndTypeIndex, methodRef })

//const content = Buffer.from(buffer);

//fs.writeFileSync('./MyBrainfuck.class', content);
//console.log('Written to .class')
//console.log(content)
