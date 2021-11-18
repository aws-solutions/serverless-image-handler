import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { WatermarkAction } from '../../../src/processor/image/watermark';
import { fixtureStore } from './utils';

test('watermark,text_aGVsbG8gd29ybGQgIQ==,rotate_25,g_se,t_70,color_ff9966', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };

  const action = new WatermarkAction();
  await action.process(ctx, 'watermark,text_aGVsbG8gd29ybGQgIQ==,rotate_25,g_se,t_70'.split(','));

  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('watermark,image_YXdzMi5wbmc=,rotate_25,g_nw,t_70', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };

  const action = new WatermarkAction();
  await action.process(ctx, 'watermark,image_YXdzMi5wbmc=,rotate_25,g_nw,t_70'.split(','));

  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});
