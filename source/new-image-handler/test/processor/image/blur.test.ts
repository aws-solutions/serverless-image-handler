import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { BlurAction } from '../../../src/processor/image/blur';
import { fixtureStore } from './utils';

test('quality action validate', () => {
  const action = new BlurAction();
  const param1 = action.validate('blur,r_3,s_2'.split(','));

  expect(param1).toEqual({
    r: 3,
    s: 2,
  });
  expect(() => {
    action.validate('blur'.split(','));
  }).toThrowError(/blur param error, e.g: blur,r_3,s_2/);
  expect(() => {
    action.validate('blur,xx'.split(','));
  }).toThrowError(/Unkown param/);
  expect(() => {
    action.validate('blur,r_-1'.split(','));
  }).toThrowError(/Blur param 'r' must be between 0 and 50/);
  expect(() => {
    action.validate('blur,s_51'.split(','));
  }).toThrowError(/Blur param 's' must be between 0 and 50/);
  expect(() => {
    action.validate('blur,s_1111'.split(','));
  }).toThrowError(/Blur param 's' must be between 0 and 50/);
});


test('quality action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new BlurAction();
  await action.process(ctx, 'blur,r_5,s_2'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe(sharp.format.jpeg.id);
});