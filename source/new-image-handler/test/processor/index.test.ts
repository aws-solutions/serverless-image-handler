import * as sharp from 'sharp';
import { ImageProcessor, StyleProcessor } from '../../src/processor/image';
import { ResizeAction } from '../../src/processor/image/resize';
import { MemKVStore, NullStore } from '../../src/store';


test('image processor singleton', () => {
  const p1 = ImageProcessor.getInstance();
  const p2 = ImageProcessor.getInstance();

  expect(p1).toBe(p2);
});

test('processor register', () => {
  class MyResizeAction extends ResizeAction {
    public readonly name: string = 'my-resize';
  }
  const p = ImageProcessor.getInstance();
  const resizeAction = new MyResizeAction();

  p.register(resizeAction);

  expect(resizeAction.name).toBe('my-resize');
  expect(p.action('my-resize') === resizeAction).toBeTruthy();
});

test('image processor test', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx = { image, bufferStore: new NullStore() };
  await ImageProcessor.getInstance().process(ctx, 'image/resize,w_100,h_100,m_fixed,limit_0/'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(100);
});

test('style processor test', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx = { image, bufferStore: new NullStore() };
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  await StyleProcessor.getInstance(styleStore).process(ctx, 'style/style1'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(100);
});

test('style processor test invalid style name', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx = { image, bufferStore: new NullStore() };
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  void expect(StyleProcessor.getInstance(styleStore).process(ctx, 'style/ #$ '.split('/')))
    .rejects.toThrowError(/Invalid style name/);
});

test('style processor not found', async () => {
  const image = sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  });
  const ctx = { image, bufferStore: new NullStore() };
  const styleStore = new MemKVStore({
    style1: { id: 'style1', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
  });
  void expect(StyleProcessor.getInstance(styleStore).process(ctx, 'style/notfound'.split('/')))
    .rejects.toThrowError(/Style not found/);
});