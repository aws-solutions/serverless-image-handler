import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as sharp from 'sharp';
import config from './config';
import { ImageProcessor } from './processor/image';

const app = new Koa();

app.use(logger());

app.use(async ctx => {
  if ('/' === ctx.path || '/ping' === ctx.path) {
    ctx.body = 'ok';
  } else if ('/debug/sharp-info' === ctx.path) {
    ctx.body = config.sharpInfo();
  } else {
    const uri = ctx.path.replace(/^\//, '');
    const actions = ((ctx.query['x-oss-process'] as string) ?? '').split('/').filter(x => x);
    const { buffer, type } = await config.store.get(uri);

    if ((actions.length > 1) && (actions[0] === ImageProcessor.getInstance().name)) {
      const imgctx = { image: sharp(buffer), store: config.store };
      await ImageProcessor.getInstance().process(imgctx, actions);
      const { data, info } = await imgctx.image.toBuffer({ resolveWithObject: true });

      ctx.body = data;
      ctx.type = info.format;
    } else {
      ctx.body = buffer;
      ctx.type = type;
    }
  }
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});