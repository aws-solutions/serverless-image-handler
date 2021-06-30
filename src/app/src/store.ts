import * as fs from 'fs';
import * as path from 'path';
import * as S3 from 'aws-sdk/clients/s3';

export interface IStore {
  get(p: string): Promise<Buffer>;
}

export class LocalStore implements IStore {
  public constructor(private root: string = '') {}

  public async get(p: string): Promise<Buffer> {
    return fs.promises.readFile(path.join(this.root, p));
  }
}

export class S3Store implements IStore {
  private _s3: S3 = new S3();

  public constructor(public readonly bucket: string) {}

  public async get(p: string): Promise<Buffer> {
    const res = await this._s3.getObject({
      Bucket: this.bucket,
      Key: p,
    }).promise();
    if (Buffer.isBuffer(res.Body)) {
      return res.Body as Buffer;
    };
    throw new Error('S3 response body is not a Buffer type');
  }
}

export class NullStore implements IStore {
  public async get(p: string): Promise<Buffer> {
    return Promise.resolve(Buffer.from(p));
  }
}