import * as fs from 'fs';
import * as path from 'path';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as S3 from 'aws-sdk/clients/s3';
import config from './config';

/**
 * A abstract store to get file data.
 * It can either get from s3 or local filesystem.
 */
export interface IStore<T> {

  /**
   * Read all buffer from underlying.
   * Return both the buffer and the s3 object/file type.
   * Usually the file type is the file's suffix.
   *
   * @param p the path of the s3 object or the file
   * @param beforeGetFunc a hook function that will be executed before get
   */
  get(p: string, beforeGetFunc?: () => void): Promise<T>;
}

export interface IKeyValue {
  [key: string]: any;
}

export interface IBufferStore extends IStore<{ buffer: Buffer; type: string }> {};

export interface IKVStore extends IStore<IKeyValue> {}


/**
 * A local file system based store.
 */
export class LocalStore implements IBufferStore {
  public constructor(private root: string = '') {}
  public async get(p: string, _?: () => void): Promise<{ buffer: Buffer; type: string }> {
    p = path.join(this.root, p);
    return {
      buffer: await fs.promises.readFile(p),
      type: filetype(p),
    };
  }
}

/**
 * S3 based store.
 */
export class S3Store implements IBufferStore {
  private _s3: S3 = new S3({ region: config.region });
  public constructor(public readonly bucket: string) {}
  public async get(p: string, beforeGetFunc?: () => void): Promise<{ buffer: Buffer; type: string }> {
    beforeGetFunc?.();
    const res = await this._s3.getObject({
      Bucket: this.bucket,
      Key: p,
    }).promise();
    if (Buffer.isBuffer(res.Body)) {
      return {
        buffer: res.Body as Buffer,
        type: res.ContentType ?? '',
      };
    };
    throw new Error('S3 response body is not a Buffer type');
  }
}

/**
 * A fake store. Only for unit test.
 */
export class NullStore implements IBufferStore {
  public async get(p: string, _?: () => void): Promise<{ buffer: Buffer; type: string }> {
    return Promise.resolve({
      buffer: Buffer.from(p),
      type: '',
    });
  }
}


export class DynamoDBStore implements IKVStore {
  private _ddb = new DynamoDB.DocumentClient({ region: config.region });
  public constructor(public readonly tableName: string) {}
  public async get(key: string, _?: () => void): Promise<IKeyValue> {
    const data = await this._ddb.get({
      TableName: this.tableName,
      Key: { id: key },
    }).promise();
    return data.Item ?? {};
  }
}

export class MemKVStore implements IKVStore {
  public constructor(public readonly dict: IKeyValue) {}

  public async get(key: string, _?: () => void): Promise<IKeyValue> {
    return Promise.resolve(this.dict[key] ?? {});
  }
}


function filetype(file: string) {
  return path.extname(file);
}