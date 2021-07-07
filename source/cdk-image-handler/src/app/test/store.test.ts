import * as path from 'path';
import * as HttpErrors from 'http-errors';
import { LocalStore, S3Store } from '../src/store';

test('local store', async () => {
  const store = new LocalStore();
  const { buffer } = await store.get(path.join(__dirname, 'fixtures/example.jpg'));

  expect(buffer.length).toBe(21839);
});

test('local store shortcut', async () => {
  const store = new LocalStore();
  const { buffer } = await store.get(path.join(__dirname, 'fixtures/example.jpg'), true);

  expect(buffer.length).toBe(21839);
});


test('s3 store shortcut', async () => {
  const store = new S3Store('sih-input');

  void expect(store.get('Sample-Small-Image-PNG-file-Download.png', true))
    .rejects
    .toThrowError(/Please visit s3/);
  void expect(store.get('Sample-Small-Image-PNG-file-Download.png', true))
    .rejects
    .toThrow(HttpErrors.HttpError);
  void expect(store.get('Sample-Small-Image-PNG-file-Download.png', true))
    .rejects
    .toThrow(expect.objectContaining({ status: 403 }));
});


test.skip('s3 store', async () => {
  const store = new S3Store('sih-input');
  const { buffer, type } = await store.get('Sample-Small-Image-PNG-file-Download.png');

  expect(type).toBe('image/png');
  expect(buffer.length).toBe(2678371);
}, 10 * 1000);