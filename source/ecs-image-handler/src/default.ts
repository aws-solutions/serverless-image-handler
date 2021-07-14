import * as path from 'path';
import config from './config';
import { InvalidArgument, IProcessor } from './processor';
import { ImageProcessor, StyleProcessor } from './processor/image';
import { IBufferStore, S3Store, LocalStore, MemKVStore, DynamoDBStore, IKVStore } from './store';

const PROCESSOR_MAP: { [key: string]: IProcessor } = {
  [ImageProcessor.getInstance().name]: ImageProcessor.getInstance(),
  [StyleProcessor.getInstance().name]: StyleProcessor.getInstance(kvstore()),
};

export function getProcessor(name: string): IProcessor {
  const processor = PROCESSOR_MAP[name];
  if (!processor) {
    throw new InvalidArgument('Can not find processor');
  }
  return processor;
}

export const bufferStore: IBufferStore = (() => {
  if (config.isProd) {
    console.log(`use ${S3Store.name}`);
    return new S3Store(config.srcBucket);
  } else {
    console.log(`use ${LocalStore.name}`);
    return new LocalStore(path.join(__dirname, '../test/fixtures'));
  }
})();

function kvstore(): IKVStore {
  if (config.isProd) {
    console.log(`use ${DynamoDBStore.name}`);
    return new DynamoDBStore(config.styleTableName);
  } else {
    console.log(`use ${MemKVStore.name}`);
    return new MemKVStore({
      box100: { id: 'box100', style: 'image/resize,w_100,h_100,m_fixed,limit_0/' },
    });
  }
}