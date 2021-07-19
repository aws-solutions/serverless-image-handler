import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { BrightAction } from '../../../src/processor/image/bright';
import { fixtureStore } from './utils';

test('quality action validate', () => {
  const action = new BrightAction();
  const param1 = action.validate('bright,50'.split(','));
  expect(param1).toEqual({
    bright: 50,
  });
  expect(() => {
    action.validate('bright'.split(','));
  }).toThrowError(/Bright param error, e.g: bright,50/);

  expect(() => {
    action.validate('bright,xx'.split(','));
  }).toThrowError(/Bright param error, e.g: bright,50/);

  expect(() => {
    action.validate('bright,23,32'.split(','));
  }).toThrowError(/Bright param error, e.g: bright,50/);

  expect(() => {
    action.validate('bright,-101'.split(','));
  }).toThrowError(/Bright must be between -100 and 100/);

  expect(() => {
    action.validate('bright,101'.split(','));
  }).toThrowError(/Bright must be between -100 and 100/);

});


test('quality action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new BrightAction();
  await action.process(ctx, 'blur,r_5,s_5'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe(sharp.format.jpeg.id);
});