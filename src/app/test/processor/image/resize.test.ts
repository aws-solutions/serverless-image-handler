
import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { ImageResizeAction } from '../../../src/processor/image/resize';

test('image resize action validate', () => {
  const action = new ImageResizeAction();
  const param1 = action.validate('resize,m_mfit,h_100,w_100,,'.split(','));
  const param2 = action.validate('resize,m_fill,h_0,w_0,,'.split(','));

  expect(param1).toEqual({
    w: 100,
    h: 100,
    m: 'mfit',
  });
  expect(param2).toEqual({
    w: 0,
    h: 0,
    m: 'fill',
  });
  expect(() => {
    action.validate('resize,m_unkown'.split(','));
  }).toThrowError(/Unkown m/);
  expect(() => {
    action.validate('resize,m_'.split(','));
  }).toThrowError(/Unkown m/);
  expect(() => {
    action.validate('resize,xx'.split(','));
  }).toThrowError(/Unkown param/);
});

test('image resize', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx: IImageContext = { image };
  const action = new ImageResizeAction();
  await action.process(ctx, 'resize,w_10,h_10'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(10);
  expect(info.height).toBe(10);
});