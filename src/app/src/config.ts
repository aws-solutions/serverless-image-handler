import * as path from 'path';
import { S3Store, LocalStore, IStore } from './store';

export interface IConfig {
  port: number;
  store: IStore;
}

const conf: IConfig = {
  port: 8080,
  store: store(),
};

function store(): IStore {
  if (process.env.NODE_ENV === 'production') {
    console.log(`use ${S3Store.name}`);
    return new S3Store(process.env.SRC_BUCKET || 'sih-input');
  }
  console.log(`use ${LocalStore.name}`);
  return new LocalStore(path.join(__dirname, '../test/fixtures'));
}

export default conf;