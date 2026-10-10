import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/request-body.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
}).outputText;
const { readBytes, readForm, readText, uploadFormBytes } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const url = 'http://localhost/api/fixture';
const post = (body, headers = {}) => new Request(url, { method: 'POST', headers, body, duplex: 'half' });
/** A body of `chunks` x `size` bytes that records how many chunks were pulled and whether it was cancelled. */
function stream(chunks, size) {
  const state = { pulled: 0, cancelled: false };
  const body = new ReadableStream({
    pull(controller) {
      if (state.pulled >= chunks) return controller.close();
      state.pulled++;
      controller.enqueue(new Uint8Array(size).fill(97));
    },
    cancel() { state.cancelled = true; },
  });
  return { body, state };
}

test('a body within the limit is read in full', async () => {
  const bytes = await readBytes(post('hello'), 10);
  assert.equal(new TextDecoder().decode(bytes), 'hello');
});

test('an oversized stream is rejected with 413 and cancelled early, without a Content-Length', async () => {
  const { body, state } = stream(1000, 1024);
  const result = await readBytes(post(body), 4096);
  assert.equal(result.status, 413);
  assert.ok(state.cancelled);
  assert.ok(state.pulled < 20, `read ${state.pulled} chunks`);
});

test('a false small Content-Length does not allow an oversized body', async () => {
  const result = await readBytes(post('x'.repeat(5000), { 'Content-Length': '10' }), 1000);
  assert.equal(result.status, 413);
});

test('a declared oversized Content-Length is rejected before reading', async () => {
  const result = await readBytes(post('small', { 'Content-Length': '99999999' }), 1000);
  assert.equal(result.status, 413);
});

test('forms parse urlencoded and multipart bodies', async () => {
  const urlencoded = await readForm(post('a=1&b=%E2%9C%93', { 'Content-Type': 'application/x-www-form-urlencoded' }));
  assert.equal(urlencoded.get('b'), '✓');
  const data = new FormData();
  data.set('kind', 'news');
  data.set('file', new File(['abc'], 'a.png', { type: 'image/png' }));
  const multipart = new Request(url, { method: 'POST', body: data });
  const form = await readForm(multipart, uploadFormBytes(1024));
  assert.equal(form.get('kind'), 'news');
  assert.equal(form.get('file').size, 3);
});

test('unsupported content types get 415 and malformed multipart gets 400', async () => {
  assert.equal((await readForm(post('{}', { 'Content-Type': 'application/json' }))).status, 415);
  assert.equal((await readForm(post('a=1'))).status, 415);
  const bad = await readForm(post('--nope\r\ngarbage', { 'Content-Type': 'multipart/form-data; boundary=real' }));
  assert.equal(bad.status, 400);
});

test('oversized forms are rejected before parsing', async () => {
  const result = await readForm(post('a=' + 'x'.repeat(5000), { 'Content-Type': 'application/x-www-form-urlencoded' }), 1000);
  assert.equal(result.status, 413);
});

test('text bodies reject invalid UTF-8 and oversize input', async () => {
  assert.equal(await readText(post('["a"]'), 100), '["a"]');
  assert.equal((await readText(post(new Uint8Array([0xff, 0xfe])), 100)).status, 400);
  assert.equal((await readText(post('x'.repeat(200)), 100)).status, 413);
});
