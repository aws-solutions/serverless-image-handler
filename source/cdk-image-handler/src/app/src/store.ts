import * as fs from 'fs';
import * as path from 'path';
import * as S3 from 'aws-sdk/clients/s3';
import * as HttpErrors from 'http-errors';


export interface IStore {
  get(p: string, shortcut?: boolean): Promise<{ buffer: Buffer; type: string }>;
}


export class LocalStore implements IStore {
  public constructor(private root: string = '') {}
  public async get(p: string, _?: boolean): Promise<{ buffer: Buffer; type: string }> {
    p = path.join(this.root, p);
    return {
      buffer: await fs.promises.readFile(p),
      type: filetype(p),
    };
  }
}


export class S3Store implements IStore {
  private _s3: S3 = new S3();
  public constructor(public readonly bucket: string) {}
  public async get(p: string, shortcut?: boolean): Promise<{ buffer: Buffer; type: string }> {
    if (shortcut) {
      // NOTE: This is intended to tell CloudFront to directly access the s3 object without through ECS cluster.
      throw new HttpErrors[403]('Please visit s3 directly');
    }
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


export class NullStore implements IStore {
  public async get(p: string, _?: boolean): Promise<{ buffer: Buffer; type: string }> {
    return Promise.resolve({
      buffer: Buffer.from(p),
      type: '',
    });
  }
}


function filetype(file: string) {
  return path.extname(file);
}