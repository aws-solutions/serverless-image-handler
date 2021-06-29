import { ImageProcessor } from '../src/processor';

test('image processor singleton', () => {
  const p1 = ImageProcessor.getInstance();
  const p2 = ImageProcessor.getInstance();

  expect(p1).toBe(p2);
});

test('process actions', () => {
  const p = ImageProcessor.getInstance();

  p.process('image/resize,w_300/quality,q_90'.split('/'));
});