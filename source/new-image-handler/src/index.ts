import * as HttpErrors from 'http-errors';
import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as sharp from 'sharp';
import config from './config';
import debug from './debug';
import { bufferStore, getProcessor, parseRequest } from './default';

const DefaultBufferStore = bufferStore();
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
  } else if ('/debug' === ctx.path) {
    ctx.body = debug();
  } else {
    const { uri, actions } = parseRequest(ctx.path, ctx.query);
    const bs = getBufferStore(ctx);
    if (actions.length > 1) {
      const processor = getProcessor(actions[0]);
      const { buffer } = await bs.get(uri);
      const imagectx = { image: sharp(buffer, { animated: true }), bufferStore: bs };
      await processor.process(imagectx, actions);
      const { data, info } = await imagectx.image.toBuffer({ resolveWithObject: true });

      ctx.body = data;
      ctx.type = info.format;
    } else {
      const { buffer, type } = await bs.get(uri, bypass);

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

function bypass() {
  // NOTE: This is intended to tell CloudFront to directly access the s3 object without through ECS cluster.
  throw new HttpErrors[403]('Please visit s3 directly');
}

function getBufferStore(ctx: Koa.ParameterizedContext) {
  const bucket = ctx.headers['x-bucket'];
  if (bucket) {
    return bufferStore(bucket.toString());
  }
  return DefaultBufferStore;
}