import fs from 'fs';

export function BufferReader(buffer, throwOnEmpty = true) {
  this.buffer = buffer;
  this.position = 0;
  this.throwOnEmpty = throwOnEmpty;
}

BufferReader.prototype.read = function(size = 1) {
  const buffer = this.buffer.slice(this.position, this.position + size);

  if (this.throwOnEmpty && buffer.length === 0) {
    throw new Error('EOF');
  }

  this.position += size;

  return buffer;
}

export function ByteReader(fd) {
  this.fd = fd;
  this.position = 0;
}

ByteReader.prototype.peek = function (size = 1) {
  const buffer = Buffer.alloc(size);
  const bytesRead = fs.readSync(this.fd, buffer, 0, size, this.position);

  if (bytesRead === 0) {
    throw new Error('EOF');
  }

  return buffer;
};

ByteReader.prototype.read = function(size = 1) {
  const buffer = Buffer.alloc(size);
  const bytesRead = fs.readSync(this.fd, buffer, 0, size, this.position);

  if (bytesRead === 0) {
    throw new Error('EOF');
  }

  this.position += bytesRead;

  return buffer;
};
