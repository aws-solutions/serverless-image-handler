import * as fs from 'fs';
import * as path from 'path';
import * as S3 from 'aws-sdk/clients/s3';
import * as HttpErrors from 'http-errors';

/**
 * A abstract store to get file data.
 * It can either get from s3 or local filesystem.
 */
export interface IStore {

  /**
   * Read all buffer from underlying.
   * Return both the buffer and the s3 object/file type.
   * Usually the file type is the file's suffix.
   *
   * @param p the path of the s3 object or the file
   * @param shortcut if true, S3Store will raise HTTP 403 error to CloudFront to tell it directly access s3 object.
   * This is intended to bypass ECS for the scenario reading original image from s3 without modification.
   */
  get(p: string, shortcut?: boolean): Promise<{ buffer: Buffer; type: string }>;
}


/**
 * A local file system based store.
 */
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

/**
 * S3 based store.
 */
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

/**
 * A fake store. Only for unit test.
 */
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