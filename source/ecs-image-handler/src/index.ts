import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as sharp from 'sharp';
import config from './config';
import { ImageProcessor } from './processor/image';

const app = new Koa();

app.use(logger());

// Error handler
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // ENOENT support
    if (err.code === 'ENOENT') {
      err.status = 404;
      err.message = 'NotFound';
    }
    ctx.status = err.statusCode || err.status || 500;
    ctx.body = {
      status: err.status,
      name: err.name,
      message: err.message,
    };

    ctx.app.emit('error', err, ctx);
  }
});

// Main handler
app.use(async ctx => {
  if ('/' === ctx.path || '/ping' === ctx.path) {
    ctx.body = 'ok';
  } else if ('/debug/sharp-info' === ctx.path) {
    ctx.body = config.sharpInfo();
  } else {
    const uri = ctx.path.replace(/^\//, '');
    const actions = ((ctx.query['x-oss-process'] as string) ?? '').split('/').filter(x => x);

    if ((actions.length > 1) && (actions[0] === ImageProcessor.getInstance().name)) {
      const { buffer } = await config.store.get(uri);
      const imgctx = { image: sharp(buffer), store: config.store };
      await ImageProcessor.getInstance().process(imgctx, actions);
      const { data, info } = await imgctx.image.toBuffer({ resolveWithObject: true });

      ctx.body = data;
      ctx.type = info.format;
    } else {
      const { buffer, type } = await config.store.get(uri, true);
      ctx.body = buffer;
      ctx.type = type;
    }
  }
});

app.on('error', (err: Error) => {
  const msg = err.stack || err.toString();
  console.error(`\n${msg.replace(/^/gm, '  ')}\n`);
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});