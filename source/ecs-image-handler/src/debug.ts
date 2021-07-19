import * as os from 'os';
import * as sharp from 'sharp';

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

export interface IDebugInfo {
  os: {
    arch: string;
    cpus: number;
    loadavg: number[];
  };
  memoryStats: string;
  memoryUsage: NodeJS.MemoryUsage;
  resourceUsage: NodeJS.ResourceUsage;
  sharp: ISharpInfo;
}

export default function debug(): IDebugInfo {
  return {
    os: {
      arch: os.arch(),
      cpus: os.cpus().length,
      loadavg: os.loadavg(),
    },
    memoryStats: `free: ${fmtmb(os.freemem())}, total: ${fmtmb(os.totalmem())}, usage ${Math.round(100 * (os.totalmem() - os.freemem()) / os.totalmem()) / 100} %`,
    memoryUsage: process.memoryUsage(),
    resourceUsage: process.resourceUsage(),
    sharp: {
      cache: sharp.cache(),
      simd: sharp.simd(),
      counters: sharp.counters(),
      concurrency: sharp.concurrency(),
      versions: sharp.versions,
    },
  };
}

function fmtmb (v: number) {
  return `${Math.round(v / 1024 / 1024 * 100) / 100} MB`;
}

