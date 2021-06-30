import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as sharp from 'sharp';
import config from './config';
import { ImageProcessor } from './processor/image';;

const app = new Koa();

app.use(logger());

app.use(async ctx => {
  if (ctx.query['x-oss-process']) {
    const buffer = await config.store.get(ctx.path.replace(/^\//, ''));
    const imgctx = { image: sharp(buffer), store: config.store };
    const actions = (ctx.query['x-oss-process'] as string).split('/');
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