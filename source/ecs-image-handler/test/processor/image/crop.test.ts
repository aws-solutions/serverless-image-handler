import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { CropAction } from '../../../src/processor/image/crop';
import { fixtureStore } from './utils';

test('quality action validate', () => {
  const action = new CropAction();
  const param1 = action.validate('crop,x_1,y_2,w_3,h_4'.split(','));
  expect(param1).toEqual({
    x: 1,
    y: 2,
    w: 3,
    h: 4,
    g: 'nw',
  });


  const param2 = action.validate('crop,x_10,y_20,w_30,h_40,g_se'.split(','));
  expect(param2).toEqual({
    x: 10,
    y: 20,
    w: 30,
    h: 40,
    g: 'se',
  });


  expect(() => {
    action.validate('crop'.split(','));
  }).toThrowError(/Crop param error, e.g: crop,x_100,y_50/);

  expect(() => {
    action.validate('crop,xx'.split(','));
  }).toThrowError(/Unkown param: /);


  expect(() => {
    action.validate('crop,w_0'.split(','));
  }).toThrowError(/Crop param 'w' must be greater than  0/);

  expect(() => {
    action.validate('crop,w_-2'.split(','));
  }).toThrowError(/Crop param 'w' must be greater than  0/);


  expect(() => {
    action.validate('crop,h_0'.split(','));
  }).toThrowError(/Crop param 'h' must be greater than  0/);

  expect(() => {
    action.validate('crop,h_-1'.split(','));
  }).toThrowError(/Crop param 'h' must be greater than  0/);


  expect(() => {
    action.validate('crop,x_-1'.split(','));
  }).toThrowError(/Crop param 'x' must be greater than or equal to 0/);


  expect(() => {
    action.validate('crop,y_-1'.split(','));
  }).toThrowError(/Crop param 'y' must be greater than or equal to 0/);


  expect(() => {
    action.validate('crop,g_abc'.split(','));
  }).toThrowError(/Crop param 'g' must be  'nw, north, ne, west, center, east, sw, south, se'/);

  //   expect(() => {
  //     action.validate('bright,-101'.split(','));
  //   }).toThrowError(/Bright must be between -100 and 100/);

  //   expect(() => {
  //     action.validate('bright,101'.split(','));
  //   }).toThrowError(/Bright must be between -100 and 100/);

});


test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10000,y_10,g_nw'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_0,y_10000,g_nw'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_0,y_1,w_10000,h_10000,g_nw'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});


test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_nw'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_north'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});


test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_ne'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});


test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_west'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_center'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});


test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_east'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});


test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_sw'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});
test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_south'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});

test('crop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new CropAction();
  await action.process(ctx, 'crop,x_10,y_10,g_se'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.format).toBe(sharp.format.jpeg.id);
});