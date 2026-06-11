// api/_lib/ai/generate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeOne, reviewOne, generateImage } from './generate.js';

const fakeChat = (payload) => ({
  chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) } },
});

test('describeOne returns the trimmed description', async () => {
  const out = await describeOne(fakeChat({ description: ' A nice park ' }), 'place', { name: 'P' });
  assert.deepEqual(out, { description: 'A nice park' });
});
test('reviewOne filters to allowed fields', async () => {
  const openai = fakeChat({ suggestions: [
    { field: 'description', suggested: 'x', reason: 'r' },
    { field: 'bogus', suggested: 'y', reason: 'r' },
  ] });
  const out = await reviewOne(openai, 'place', { name: 'P' });
  assert.deepEqual(out, [{ field: 'description', suggested: 'x', reason: 'r' }]);
});
test('describeOne surfaces a model refusal as an error', async () => {
  const openai = { chat: { completions: { create: async () => ({ choices: [{ message: { refusal: 'no' } }] }) } } };
  await assert.rejects(() => describeOne(openai, 'place', {}), /refus/i);
});
test('generateImage decodes b64, uploads via put, stamps generated', async () => {
  const openai = { images: { generate: async () => ({ data: [{ b64_json: Buffer.from('img').toString('base64') }] }) } };
  let putArgs = null;
  const put = async (path, bytes, opts) => { putArgs = { path, bytes, opts }; return { url: 'https://blob/' + path }; };
  const out = await generateImage({ openai, put }, 'place', { id: 'p1', name: 'P' });
  assert.equal(out.generated, true);
  assert.match(out.url, /^https:\/\/blob\/places\/ai-p1-/);
  assert.equal(putArgs.bytes.toString(), 'img');
  assert.equal(putArgs.opts.access, 'public');
});
