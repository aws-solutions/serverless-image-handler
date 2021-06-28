import * as Koa from 'koa';
import config from './config';

const app = new Koa();

app.use(ctx => {
  ctx.body = 'HELLO WORLD';
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});