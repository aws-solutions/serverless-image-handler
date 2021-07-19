import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { AutoOrientAction } from '../../../src/processor/image/auto-orient';
import { fixtureStore } from './utils';

test('quality action validate', () => {
  const action = new AutoOrientAction();
  const param0 = action.validate('auto-orient,0'.split(','));
  expect(param0).toEqual({
    auto: 0,
  });
  const param1 = action.validate('auto-orient,1'.split(','));
  expect(param1).toEqual({
    auto: 1,
  });


  expect(() => {
    action.validate('auto-orient,1,2'.split(','));
  }).toThrowError(/Auto-orient param error, e.g: auto-orient,1/);

  expect(() => {
    action.validate('auto-orient'.split(','));
  }).toThrowError(/Auto-orient param error, e.g: auto-orient,1/);


  expect(() => {
    action.validate('auto-orient,xx'.split(','));
  }).toThrowError(/Auto-orient param must be 0 or 1/);

  expect(() => {
    action.validate('auto-orient,20'.split(','));
  }).toThrowError(/Auto-orient param must be 0 or 1/);

});


test('quality action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new AutoOrientAction();
  await action.process(ctx, 'auto-orient,1'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.format).toBe(sharp.format.jpeg.id);
});