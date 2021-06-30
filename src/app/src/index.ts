import * as path from 'path';
import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as sharp from 'sharp';
import config from './config';
import { ImageProcessor } from './processor/image';
import { LocalStore } from './store';

const app = new Koa();
const store = new LocalStore();

app.use(logger());

app.use(async ctx => {
  if (ctx.query['x-oss-process']) {
    const buffer = await store.get(path.join(__dirname, '../test/fixtures/example.jpg'));
    const imgctx = { image: sharp(buffer), store };
    const actions: string[] = (ctx.query['x-oss-process'] as string).split('/');
    await ImageProcessor.getInstance().process(imgctx, actions);
    const { data, info } = await imgctx.image.toBuffer({ resolveWithObject: true });

    ctx.body = data;
    ctx.type = info.format;
  } else {
    ctx.body = 'HELLO WORLD';
  }
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});