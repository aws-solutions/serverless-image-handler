import * as path from 'path';
import { LocalStore } from '../src/store';

test('local store', async () => {
  const store = new LocalStore();
  const buf = await store.get(path.join(__dirname, 'fixtures/example.jpg'));

  expect(buf.length).toBe(21839);
});