import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { ResizeAction } from '../../../src/processor/image/resize';
import { NullStore } from '../../../src/store';

test('resize action validate', () => {
  const action = new ResizeAction();
  const param1 = action.validate('resize,m_mfit,h_100,w_100,,'.split(','));
  const param2 = action.validate('resize,m_fill,h_0,w_0,,'.split(','));

  expect(param1).toEqual({
    w: 100,
    h: 100,
    m: 'mfit',
    limit: true,
    color: '#FFFFFF',
  });
  expect(param2).toEqual({
    w: 0,
    h: 0,
    m: 'fill',
    limit: true,
    color: '#FFFFFF',
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

test('resize action simple', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: 'red',
    },
  });
  const ctx: IImageContext = { image, store: new NullStore() };
  const action = new ResizeAction();
  await action.process(ctx, 'resize,w_10,h_10'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(10);
  expect(info.height).toBe(10);
});

test('resize action m_lfit', async () => {
  const image = sharp({
    create: {
      width: 200,
      height: 100,
      channels: 3,
      background: 'gray',
    },
  });
  const ctx: IImageContext = { image, store: new NullStore() };
  const action = new ResizeAction();
  await action.process(ctx, 'resize,w_150,h_80,m_lfit'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(150);
  expect(info.height).toBe(75);
});

test('resize action m_mfit', async () => {
  const image = sharp({
    create: {
      width: 200,
      height: 100,
      channels: 3,
      background: 'gray',
    },
  });
  const ctx: IImageContext = { image, store: new NullStore() };
  const action = new ResizeAction();
  await action.process(ctx, 'resize,w_150,h_80,m_mfit'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(160);
  expect(info.height).toBe(80);
});

test('resize action m_fill', async () => {
  const image = sharp({
    create: {
      width: 200,
      height: 100,
      channels: 3,
      background: 'gray',
    },
  });
  const ctx: IImageContext = { image, store: new NullStore() };
  const action = new ResizeAction();
  await action.process(ctx, 'resize,w_150,h_80,m_fill'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(150);
  expect(info.height).toBe(80);
});

test('resize action m_pad', async () => {
  const image = sharp({
    create: {
      width: 200,
      height: 100,
      channels: 3,
      background: 'gray',
    },
  });
  const ctx: IImageContext = { image, store: new NullStore() };
  const action = new ResizeAction();
  await action.process(ctx, 'resize,w_150,h_80,m_pad'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(150);
  expect(info.height).toBe(80);
});

// TODO: Seems that Sharp.js will use origin image's aspect ratio instead of
// intermediate image's aspect ratio
test.skip('resize action m_fixed m_lfit', async () => {
  const image = sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: 'gray',
    },
  });
  const ctx: IImageContext = { image, store: new NullStore() };
  const action = new ResizeAction();
  await action.process(ctx, 'resize,w_200,h_100,m_fixed'.split(','));
  await action.process(ctx, 'resize,w_150,h_100,m_lfit'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(150);
  expect(info.height).toBe(75);
});