import * as path from 'path';
import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as sharp from 'sharp';
import config from './config';
import { ImageProcessor } from './processor/image';

const app = new Koa();

app.use(logger());

app.use(async ctx => {
  if (ctx.query['x-oss-process']) {
    const image = sharp(path.join(__dirname, '../test/fixtures/example.jpg'));
    const imgCtx = { image };
    const actions: string[] = (ctx.query['x-oss-process'] as string).split('/');
    await ImageProcessor.getInstance().process(imgCtx, actions);
    const { data, info } = await imgCtx.image.toBuffer({ resolveWithObject: true });
    ctx.body = data;
    ctx.type = info.format;
  } else {
    ctx.body = 'HELLO WORLD';
  }
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});