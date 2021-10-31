import { parseRequest, kvstore } from '../src/default';

test('parseActions empty', () => {
  expect(parseRequest('', {})).toEqual({
    uri: '',
    actions: [],
  });
  expect(parseRequest('/example.jpg', {})).toEqual({
    uri: 'example.jpg',
    actions: [],
  });
});

test('parseActions x-oss-process', () => {
  expect(parseRequest('', {
    'x-oss-process': '',
  })).toEqual({
    uri: '',
    actions: [],
  });
  expect(parseRequest('', {
    'x-oss-process': '//image/resize,w_100,h_100,m_fixed,limit_0//quality,q_1//',
  })).toEqual({
    uri: '',
    actions: ['image', 'resize,w_100,h_100,m_fixed,limit_0', 'quality,q_1'],
  });
});

test('parseActions custom delimiter', () => {
  expect(parseRequest('/example.jpg@!ABCabc.-_', {})).toEqual({
    uri: 'example.jpg',
    actions: ['style', 'ABCabc.-_'],
  });
  expect(parseRequest('/example.jpg!ABCabc.-_', {})).toEqual({
    uri: 'example.jpg',
    actions: ['style', 'ABCabc.-_'],
  });
  expect(() => parseRequest('/example.jpg@!  ', {})).toThrowError(/Empty style name/);
});

test('kvstore', async () => {
  const store = kvstore();
  expect(await store.get('box100')).toEqual({
    style: 'image/resize,w_100,h_100,m_fixed,limit_0/',
  });
});