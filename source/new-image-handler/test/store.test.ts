import * as path from 'path';
import * as HttpErrors from 'http-errors';
import { DynamoDBStore, LocalStore, MemKVStore, S3Store } from '../src/store';

test('local store', async () => {
  const store = new LocalStore();
  const { buffer } = await store.get(path.join(__dirname, 'fixtures/example.jpg'));

  expect(buffer.length).toBe(21839);
});

test('local store shortcut', async () => {
  const fn = jest.fn();
  const store = new LocalStore();
  const { buffer } = await store.get(path.join(__dirname, 'fixtures/example.jpg'), fn);

  expect(buffer.length).toBe(21839);
});


test('s3 store shortcut', async () => {
  const bypass = () => {
    // NOTE: This is intended to tell CloudFront to directly access the s3 object without through ECS cluster.
    throw new HttpErrors[403]('Please visit s3 directly');
  };
  const store = new S3Store('sih-input');

  void expect(store.get('Sample-Small-Image-PNG-file-Download.png', bypass))
    .rejects
    .toThrowError(/Please visit s3/);
  void expect(store.get('Sample-Small-Image-PNG-file-Download.png', bypass))
    .rejects
    .toThrow(HttpErrors.HttpError);
  void expect(store.get('Sample-Small-Image-PNG-file-Download.png', bypass))
    .rejects
    .toThrow(expect.objectContaining({ status: 403 }));
});


test('MemKV Store', async () => {
  const store = new MemKVStore({
    a: { id: 'a', value: 'a' },
    b: { id: 'b', value: 'b' },
  });

  expect(await store.get('a')).toEqual({ id: 'a', value: 'a' });
  expect(await store.get('123')).toEqual({});
});


test.skip('s3 store', async () => {
  const store = new S3Store('sih-input');
  const { buffer, type } = await store.get('Sample-Small-Image-PNG-file-Download.png');

  expect(type).toBe('image/png');
  expect(buffer.length).toBe(2678371);
}, 10 * 1000);


test.skip('dynamodb store', async () => {
  const table = 'serverless-new-image-handler-stack-serverlessecrimagehandlerstackStyleTableE94C4297-PTLOYODP1J7E';
  const ddbstore = new DynamoDBStore(table);

  console.log(await ddbstore.get('hello'));
});