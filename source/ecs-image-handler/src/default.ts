import * as path from 'path';
import { ParsedUrlQuery } from 'querystring';
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

export function parseRequest(uri: string, query: ParsedUrlQuery): {uri: string; actions: string[]} {
  uri = uri.replace(/^\//, ''); // trim leading slash "/"
  const parts = uri.split(/@?!/, 2);
  if (parts.length === 1) {
    const x_oss_process = (query['x-oss-process'] as string) ?? '';
    return {
      uri: uri,
      actions: x_oss_process.split('/').filter(x => x),
    };
  }
  const stylename = (parts[1] ?? '').trim();
  if (!stylename) {
    throw new InvalidArgument('Empty style name');
  }
  return {
    uri: parts[0],
    actions: ['style', stylename],
  };
}