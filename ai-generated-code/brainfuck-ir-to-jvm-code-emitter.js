import fs from 'node:fs';

/* -------------------- tiny binary helpers -------------------- */
const u1 = n => Buffer.from([n & 0xFF]);
const u2 = n => Buffer.from([(n >> 8) & 0xFF, n & 0xFF]);
const u4 = n => Buffer.from([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);

/* -------------------- constant pool builder -------------------- */
const cp = [];
const add = b => (cp.push(b), cp.length); // returns 1-based index
const utf8 = s => Buffer.concat([u1(1), u2(Buffer.byteLength(s)), Buffer.from(s, 'utf8')]);
const addUtf8 = s => add(utf8(s));
const addClass = (nameUtf8Idx) => add(Buffer.concat([u1(7), u2(nameUtf8Idx)]));
const addNameAndType = (nameIdx, descIdx) => add(Buffer.concat([u1(12), u2(nameIdx), u2(descIdx)]));
const addFieldRef = (clsIdx, ntIdx) => add(Buffer.concat([u1(9), u2(clsIdx), u2(ntIdx)]));
const addMethodRef = (clsIdx, ntIdx) => add(Buffer.concat([u1(10), u2(clsIdx), u2(ntIdx)]));

/* -------------------- build constant pool entries -------------------- */
const idx_ClassName_Utf8 = addUtf8('Brainfuck');
const idx_Super_Utf8      = addUtf8('java/lang/Object');
const idx_ClassName       = addClass(idx_ClassName_Utf8);
const idx_Super           = addClass(idx_Super_Utf8);

const idx_Code_Utf8       = addUtf8('Code');
const idx_main_Utf8       = addUtf8('main');
const idx_main_Desc_Utf8  = addUtf8('([Ljava/lang/String;)V');

const idx_System_Utf8     = addUtf8('java/lang/System');
const idx_PrintStream_Utf8= addUtf8('java/io/PrintStream');
const idx_InputStream_Utf8= addUtf8('java/io/InputStream');
const idx_out_Utf8        = addUtf8('out');
const idx_out_Desc_Utf8   = addUtf8('Ljava/io/PrintStream;');
const idx_in_Utf8         = addUtf8('in');
const idx_in_Desc_Utf8    = addUtf8('Ljava/io/InputStream;');
const idx_write_Utf8      = addUtf8('write');
const idx_write_Desc_Utf8 = addUtf8('(I)V');
const idx_read_Utf8       = addUtf8('read');
const idx_read_Desc_Utf8  = addUtf8('()I');

const idx_System_Class    = addClass(idx_System_Utf8);
const idx_PrintStream_Class = addClass(idx_PrintStream_Utf8);
const idx_InputStream_Class = addClass(idx_InputStream_Utf8);

const idx_out_NT          = addNameAndType(idx_out_Utf8,  idx_out_Desc_Utf8);
const idx_in_NT           = addNameAndType(idx_in_Utf8,   idx_in_Desc_Utf8);
const idx_write_NT        = addNameAndType(idx_write_Utf8, idx_write_Desc_Utf8);
const idx_read_NT         = addNameAndType(idx_read_Utf8,  idx_read_Desc_Utf8);

const idx_out_FieldRef    = addFieldRef(idx_System_Class, idx_out_NT);
const idx_in_FieldRef     = addFieldRef(idx_System_Class, idx_in_NT);
const idx_write_MethodRef = addMethodRef(idx_PrintStream_Class, idx_write_NT);
const idx_read_MethodRef  = addMethodRef(idx_InputStream_Class, idx_read_NT);

/* -------------------- opcode constants -------------------- */
const OP = {
  // consts
  iconst_m1: 0x02, iconst_0: 0x03, iconst_1: 0x04, iconst_2: 0x05, iconst_3: 0x06, iconst_4: 0x07, iconst_5: 0x08,
  bipush: 0x10, sipush: 0x11,
  i2b: 0x91,
  // loads/stores (generic)
  iload: 0x15, istore: 0x36, aload: 0x19, astore: 0x3a,
  // array
  newarray: 0xbc, baload: 0x33, bastore: 0x54,
  // stack ops
  dup2: 0x5c, swap: 0x5f,
  // math
  iadd: 0x60, isub: 0x64,
  // control
  ifeq: 0x99, ifne: 0x9a, _goto: 0xa7, _return: 0xb1,
  // fields/methods
  getstatic: 0xb2, invokevirtual: 0xb6,
};

/* -------------------- small emit buffer -------------------- */
class CodeBuf {
  constructor() { this.bytes = []; this.pc = 0; }
  emit1(b) { this.bytes.push(b & 0xFF); this.pc += 1; }
  emit2(n) { this.bytes.push((n>>8)&0xFF, n&0xFF); this.pc += 2; }
  emit4(n) { this.bytes.push((n>>>24)&0xFF, (n>>>16)&0xFF, (n>>>8)&0xFF, n&0xFF); this.pc += 4; }
  emitU1(b){ this.emit1(b); }
  emitU2(n){ this.emit2(n); }
  toBuffer(){ return Buffer.from(this.bytes); }
}

/* -------------------- tiny helpers to push small ints -------------------- */
function emitIconst(cb, n) {
  if (n >= -1 && n <= 5) cb.emit1([OP.iconst_m1,OP.iconst_0,OP.iconst_1,OP.iconst_2,OP.iconst_3,OP.iconst_4,OP.iconst_5][n+1]);
  else if (n >= -128 && n <= 127) { cb.emit1(OP.bipush); cb.emit1(n); }
  else { cb.emit1(OP.sipush); cb.emit2(n); }
}

/* -------------------- IR -> bytecode emitter (two-pass for jumps) -------------------- */
function emitMainFromIR(ir) {
  const cb = new CodeBuf();
  const labelPC = new Map(); // IR index -> bytecode pc
  const patches = [];        // { at /*offset pos*/, op /*ifeq/ifne*/, targetIr }

  const LOCAL = { args:0, memory:1, cell:2, tmp:3 }; // we only use memory & cell

  // prologue: allocate memory byte[30000], cell=0
  emitIconst(cb, 30000);              // sipush 30000
  cb.emit1(OP.newarray); cb.emit1(8); // 8 = T_BYTE
  cb.emit1(OP.astore); cb.emit1(LOCAL.memory);
  emitIconst(cb, 0);
  cb.emit1(OP.istore); cb.emit1(LOCAL.cell);

  // first pass: record labelPC & emit with placeholders
  for (let i = 0; i < ir.length; i++) {
    labelPC.set(i, cb.pc);
    const ins = ir[i];
    switch (ins.type) {
      case 'increment': {
        // memory[cell] += inc  (wrap via i2b on store)
        cb.emit1(OP.aload); cb.emit1(LOCAL.memory);   // arrayref
        cb.emit1(OP.iload); cb.emit1(LOCAL.cell);     // index
        cb.emit1(OP.dup2);                            // keep a copy for store
        cb.emit1(OP.baload);                          // -> int
        emitIconst(cb, ins.inc);
        cb.emit1(OP.iadd);
        cb.emit1(OP.i2b);                             // to byte (wraps the low 8 bits)
        cb.emit1(OP.bastore);
        break;
      }
      case 'move_head': {
        emitIconst(cb, ins.head);
        cb.emit1(OP.istore); cb.emit1(LOCAL.cell);
        break;
      }
      case 'jump_eqz': {
        // if (memory[cell] == 0) goto target
        cb.emit1(OP.aload); cb.emit1(LOCAL.memory);
        cb.emit1(OP.iload); cb.emit1(LOCAL.cell);
        cb.emit1(OP.baload);
        cb.emit1(OP.ifeq);
        const patchAt = cb.pc;    // where 2-byte offset will go
        cb.emit2(0);              // placeholder
        patches.push({ at: patchAt, targetIr: ins.jmp, kind: 'cond' });
        break;
      }
      case 'jump_neqz': {
        // if (memory[cell] != 0) goto target
        cb.emit1(OP.aload); cb.emit1(LOCAL.memory);
        cb.emit1(OP.iload); cb.emit1(LOCAL.cell);
        cb.emit1(OP.baload);
        cb.emit1(OP.ifne);
        const patchAt = cb.pc;
        cb.emit2(0);
        patches.push({ at: patchAt, targetIr: ins.jmp, kind: 'cond_ne' });
        break;
      }
      case 'output': {
        // System.out.write(memory[cell])
        cb.emit1(OP.getstatic); cb.emit2(idx_out_FieldRef);
        cb.emit1(OP.aload); cb.emit1(LOCAL.memory);
        cb.emit1(OP.iload); cb.emit1(LOCAL.cell);
        cb.emit1(OP.baload);                 // -> int
        cb.emit1(OP.invokevirtual); cb.emit2(idx_write_MethodRef); // PrintStream.write(I)V
        break;
      }
      case 'input': {
        // b = System.in.read(); memory[cell] = (byte)b
        cb.emit1(OP.getstatic); cb.emit2(idx_in_FieldRef);
        cb.emit1(OP.invokevirtual); cb.emit2(idx_read_MethodRef);  // ()I
        cb.emit1(OP.i2b);
        cb.emit1(OP.aload); cb.emit1(LOCAL.memory);
        cb.emit1(OP.iload); cb.emit1(LOCAL.cell);
        cb.emit1(OP.swap);                     // stack: arr idx val -> arr val idx
        cb.emit1(OP.bastore);
        break;
      }
      case 'halt': {
        cb.emit1(OP._return);
        break;
      }
      default:
        throw new Error(`Unknown IR op: ${ins.type}`);
    }
  }

  // ensure method ends with return (in case IR lacks 'halt')
  if (cb.bytes[cb.bytes.length-1] !== OP._return) cb.emit1(OP._return);

  // second pass: backpatch conditional branches (16-bit signed, relative to next instruction)
  for (const p of patches) {
    const targetPc = labelPC.get(p.targetIr);
    const at = p.at;                 // where offset bytes start
    // find opcode position: for ifeq/ifne, opcode is 1 byte before 'at'
    const opcodePos = at - 1;
    const nextPos = at + 1;          // after the 2-byte offset
    const offset = targetPc - nextPos; // relative to next instruction
    // write signed 16-bit big endian at 'at'
    cb.bytes[at]   = (offset >> 8) & 0xFF;
    cb.bytes[at+1] = offset & 0xFF;
  }

  // very safe upper bounds (you can compute exacts later)
  const maxStack = 8;
  const maxLocals = 3; // args(0), memory(1), cell(2)

  return { code: cb.toBuffer(), maxStack, maxLocals };
}

/* -------------------- wrap into a full .class file -------------------- */
function buildClass(ir) {
  const { code, maxStack, maxLocals } = emitMainFromIR(ir);

  // Method: public static main([Ljava/lang/String;)V with Code attribute
  const access_flags = 0x0001 | 0x0008; // ACC_PUBLIC | ACC_STATIC
  const methods = [];

  // method_info for main
  const method_main = [];
  method_main.push(...u2(access_flags));
  method_main.push(...u2(addUtf8('main')));                 // name_index
  method_main.push(...u2(addUtf8('([Ljava/lang/String;)V'))); // descriptor_index
  // attributes_count = 1 (Code)
  method_main.push(...u2(1));

  // Code attribute
  const codeAttr = [];
  codeAttr.push(...u2(idx_Code_Utf8)); // attribute_name_index
  const code_body = [];
  code_body.push(...u2(maxStack));
  code_body.push(...u2(maxLocals));
  code_body.push(...u4(code.length));
  code_body.push(...code);
  code_body.push(...u2(0)); // exception_table_length
  code_body.push(...u2(0)); // attributes_count
  const codeAttrLen = u4(Buffer.from(code_body).length);
  const codeAttrFull = Buffer.from([u2(idx_Code_Utf8), codeAttrLen, ...code_body]);

  method_main.push(...codeAttrFull);

  const methods_count = 1;
  methods.push(Buffer.concat(method_main.map(b => Buffer.isBuffer(b) ? b : Buffer.from([b]))));

  // Assemble ClassFile
  const header = Buffer.concat([
    u4(0xCAFEBABE),
    u2(0),      // minor_version
    u2(52),     // major_version (Java 8). Bump if you want newer.
    u2(cp.length + 1),
    ...cp,      // constant_pool
    u2(0x0021), // access_flags: ACC_PUBLIC | ACC_SUPER
    u2(idx_ClassName),
    u2(idx_Super),
    u2(0),      // interfaces_count
    // fields_count = 0 (we keep memory/cell as locals in main for simplicity)
    u2(0),
    u2(methods_count),
    ...methods,
    u2(0)       // attributes_count at class level
  ]);

  return header;
}

/* -------------------- demo with your IR -------------------- */
const ir = [
  { type: 'increment', inc: 2, pointer: 0 },
  { type: 'move_head', head: 1 },
  { type: 'increment', inc: 5, pointer: 1 },
  { type: 'move_head', head: 4 },
  { type: 'increment', inc: 4, pointer: 4 },
  { type: 'move_head', head: 1 },
  { type: 'jump_eqz', jmp: 12 },
  { type: 'move_head', head: 0 },
  { type: 'increment', inc: 1, pointer: 0 },
  { type: 'move_head', head: 1 },
  { type: 'increment', inc: -1, pointer: 1 },
  { type: 'jump_neqz', jmp: 7 },
  { type: 'increment', inc: 4, pointer: 1 },
  { type: 'increment', inc: 4, pointer: 1 },
  { type: 'jump_eqz', jmp: 21 },
  { type: 'move_head', head: 0 },
  { type: 'increment', inc: 3, pointer: 0 },
  { type: 'increment', inc: 3, pointer: 0 },
  { type: 'move_head', head: 1 },
  { type: 'increment', inc: -1, pointer: 1 },
  { type: 'jump_neqz', jmp: 15 },
  { type: 'move_head', head: 0 },
  { type: 'output' },
  { type: 'halt' }
];

const cls = buildClass(ir);
fs.writeFileSync('Brainfuck.class', cls);
console.log('Wrote Brainfuck.class');
