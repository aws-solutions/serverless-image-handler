import * as sharp from 'sharp';
import { IImageContext } from '../../../src/processor/image';
import { IndexCropAction } from '../../../src/processor/image/indexcrop';
import { fixtureStore } from './utils';


test('indexcrop action validate', () => {
  const action = new IndexCropAction();
  expect(() => {
    action.validate('indexcrop'.split(','));
  }).toThrowError(/IndexCrop param error, e.g: indexcrop,x_100,i_0/);
});


test('indexcrop action validate', () => {
  const action = new IndexCropAction();
  const param1 = action.validate('indexcrop,x_100,i_0'.split(','));
  expect(param1).toEqual({
    x: 100,
    i: 0,
    y: 0,
  });

  expect(() => {
    action.validate('indexcrop,x_-10,i_0'.split(','));
  }).toThrowError(/Param error:  'x' value must be greater than 0/);

  expect(() => {
    action.validate('indexcrop,i_10'.split(','));
  }).toThrowError(/Param error:  One of 'x' and 'y' must be entered/);

  expect(() => {
    action.validate('indexcrop,x_10,y_100'.split(','));
  }).toThrowError(/Param error:  Cannot enter 'x' and 'y' at the same time/);


});

test('indexcrop action validate', () => {
  const action = new IndexCropAction();
  expect(() => {
    action.validate('indexcrop,x_10,y_10'.split(','));
  }).toThrowError(/Param error:  Cannot enter 'x' and 'y' at the same time/);
});

test('indexcrop action validate', () => {
  const action = new IndexCropAction();
  expect(() => {
    action.validate('indexcrop,y_-10,i_0'.split(','));
  }).toThrowError(/Param error:  'y' value must be greater than 0/);
});


test('indexcrop action validate', () => {
  const action = new IndexCropAction();
  expect(() => {
    action.validate('indexcrop,x_10,i_0,abc'.split(','));
  }).toThrowError(/Unkown param/);
});


test('indexcrop action 01', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,x_100,i_0'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.width).toBe(100);
});


test('indexcrop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,y_100,i_0'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.height).toBe(100);
});


test('indexcrop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,y_10000,i_0'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.height).toBeGreaterThan(100);
});

test('indexcrop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,x_10000,i_0'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.height).toBeGreaterThan(100);
});

test('indexcrop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,x_100,i_100'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.height).toBeGreaterThan(100);
});


test('indexcrop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,y_100,i_100'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.height).toBeGreaterThan(100);
});

test('indexcrop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,x_250,i_1'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.height).toBeGreaterThan(100);
});

test('indexcrop action', async () => {
  const image = sharp((await fixtureStore.get('example.jpg')).buffer);
  const ctx: IImageContext = { image, bufferStore: fixtureStore };
  const action = new IndexCropAction();
  await action.process(ctx, 'indexcrop,y_200,i_1'.split(','));
  const { info } = await ctx.image.toBuffer({ resolveWithObject: true });
  expect(info.height).toBeGreaterThan(201);
});