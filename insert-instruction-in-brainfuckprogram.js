import fs from 'node:fs';

const fd = fs.openSync('./BrainfuckProgram.class', 'r');

const fileSize = fs.fstatSync(fd).size;
const fileData = Buffer.alloc(fileSize);
fs.readSync(fd, fileData, 0, fileSize, 0);
fs.closeSync(fd);

const currentAttributeLegth = fileData.readUInt32BE(0x106);
const newAttributeLength = currentAttributeLegth + 3;
fileData.writeUInt32BE(newAttributeLength, 0x106);

const currentLength = fileData.readUInt32BE(270);
const newLength = currentLength + 3;
fileData.writeUInt32BE(newLength, 270);

const before = fileData.slice(0, 274);
const after = fileData.slice(274);

// New instructions: bipush 42, pop
const newInstructions = Buffer.from([0x10, 0x2A, 0x57]);

const newFile = Buffer.concat([before, newInstructions, after]);

fs.writeFileSync('./BrainfuckProgram_modified.class', newFile);

console.log('Done - saved to BrainfuckProgram_modified.class');
