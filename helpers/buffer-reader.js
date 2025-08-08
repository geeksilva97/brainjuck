import fs from 'fs';

export function BufferReader(buffer) {
  this.buffer = buffer;
  this.position = 0;
}

BufferReader.prototype.read = function(size = 1) {
  const buffer = this.buffer.slice(this.position, this.position + size);

  if (buffer.length === 0) {
    throw new Error('EOF');
  }

  this.position += size;

  return buffer;
}

export function ByteReader(fd) {
  this.fd = fd;
  this.position = 0;
}

ByteReader.prototype.read = function(size = 1) {
  const buffer = Buffer.alloc(size);
  const bytesRead = fs.readSync(this.fd, buffer, 0, size, this.position);

  if (bytesRead === 0) {
    throw new Error('EOF');
  }

  this.position += bytesRead;

  return buffer;
};
