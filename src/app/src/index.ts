import * as Koa from 'koa';
import * as logger from 'koa-logger';
import config from './config';

const app = new Koa();

app.use(logger());

app.use(ctx => {
  console.log((ctx.query['x-oss-process'] as string).split('/'));

  ctx.body = 'HELLO WORLD';
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});