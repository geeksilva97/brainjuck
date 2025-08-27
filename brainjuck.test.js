import { spawnSync } from 'child_process';
import test from 'node:test';

test('compile brainfuck to jvm', (t) => {
  let r = spawnSync('./brainjuck', ['samples/helloworld.bf', 'CompiledHelloWorld'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.assert.strictEqual(r.status, 0, 'brainjuck exited with code 0');
  t.assert.strictEqual(r.stderr.toString(), '', 'brainjuck did not output to stderr');
  t.assert.match(r.stdout.toString('utf8'), /CompiledHelloWorld.class generated/, 'brainjuck output to stdout');

  r = spawnSync('java', ['-cp', '.', 'CompiledHelloWorld'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.assert.strictEqual(r.status, 0, 'brainjuck exited with code 0');
  t.assert.strictEqual(r.stderr.toString(), '', 'brainjuck did not output to stderr');
  t.assert.match(r.stdout.toString('utf8'), /Hello, World/, 'brainjuck output to stdout');
});
