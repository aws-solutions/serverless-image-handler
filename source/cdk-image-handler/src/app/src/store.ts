import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as S3 from 'aws-sdk/clients/s3';


export interface IStore {
  get(p: string): Promise<{ buffer: Buffer; type: string }>;
  createReadStream(p: string): { stream: stream.Readable; type: string };
}


export class LocalStore implements IStore {
  public constructor(private root: string = '') {}
  public async get(p: string): Promise<{ buffer: Buffer; type: string }> {
    p = path.join(this.root, p);
    return {
      buffer: await fs.promises.readFile(p),
      type: filetype(p),
    };
  }
  public createReadStream(p: string): { stream: stream.Readable; type: string } {
    p = path.join(this.root, p);
    return {
      stream: fs.createReadStream(p),
      type: filetype(p),
    };
  }
}


export class S3Store implements IStore {
  private _s3: S3 = new S3();
  public constructor(public readonly bucket: string) {}
  public async get(p: string): Promise<{ buffer: Buffer; type: string }> {
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
  public createReadStream(_: string): { stream: stream.Readable; type: string } {
    throw new Error('Method not implemented.');
  }
}


export class NullStore implements IStore {
  public async get(p: string): Promise<{ buffer: Buffer; type: string }> {
    return Promise.resolve({
      buffer: Buffer.from(p),
      type: '',
    });
  }
  public createReadStream(p: string): { stream: stream.Readable; type: string } {
    return {
      stream: stream.Readable.from([p]),
      type: '',
    };
  }
}


function filetype(file: string) {
  return path.extname(file);
}