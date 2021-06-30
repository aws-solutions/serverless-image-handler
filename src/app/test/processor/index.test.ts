import * as sharp from 'sharp';
import { ImageProcessor } from '../../src/processor/image';
import { ImageResizeAction } from '../../src/processor/image/resize';
import { NullStore } from '../../src/store';


test('image processor singleton', () => {
  const p1 = ImageProcessor.getInstance();
  const p2 = ImageProcessor.getInstance();

  expect(p1).toBe(p2);
});

test('processor register', () => {
  class MyResizeAction extends ImageResizeAction {
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
  const ctx = { image, store: new NullStore() };
  await ImageProcessor.getInstance().process(ctx, 'image/resize,w_100,h_100/'.split('/'));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });

  expect(info.width).toBe(100);
  expect(info.height).toBe(100);
});