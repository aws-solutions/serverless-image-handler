import * as path from 'path';
import * as sharp from 'sharp';
import { S3Store, LocalStore, IStore } from './store';

export interface ISharpInfo {
  cache: sharp.CacheResult;
  simd: boolean;
  counters: sharp.SharpCounters;
  concurrency: number;
  versions: {
    vips: string;
    cairo?: string;
    croco?: string;
    exif?: string;
    expat?: string;
    ffi?: string;
    fontconfig?: string;
    freetype?: string;
    gdkpixbuf?: string;
    gif?: string;
    glib?: string;
    gsf?: string;
    harfbuzz?: string;
    jpeg?: string;
    lcms?: string;
    orc?: string;
    pango?: string;
    pixman?: string;
    png?: string;
    svg?: string;
    tiff?: string;
    webp?: string;
    avif?: string;
    heif?: string;
    xml?: string;
    zlib?: string;
  };
}

export interface IConfig {
  port: number;
  store: IStore;
  sharpInfo(): ISharpInfo;
}

const conf: IConfig = {
  port: 8080,
  store: store(),
  sharpInfo() {
    return {
      cache: sharp.cache(),
      simd: sharp.simd(),
      counters: sharp.counters(),
      concurrency: sharp.concurrency(),
      versions: sharp.versions,
    };
  },
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