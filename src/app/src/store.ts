import * as fs from 'fs';

export interface IStore {
  get(p: string): Promise<Buffer>;
}

export class LocalStore implements IStore {
  public async get(p: string): Promise<Buffer> {
    return fs.promises.readFile(p);
  }
}

export class S3Store implements IStore {
  public async get(p: string): Promise<Buffer> {
    // TODO: Implement s3.getObject
    return Promise.resolve(Buffer.from(p));
  }
}

export class NullStore implements IStore {
  public async get(p: string): Promise<Buffer> {
    return Promise.resolve(Buffer.from(p));
  }
}