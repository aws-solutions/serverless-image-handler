import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import * as is from '../../is';

export interface RoundedCornersOpts extends IActionOpts {
  r: number;
}

export class RoundedCornersAction implements IImageAction {
  public readonly name: string = 'rounded-corners';

  public validate(params: string[]): ReadOnly<RoundedCornersOpts> {
    let opt: RoundedCornersOpts = { r: 1 };

    if (params.length !== 2) {
      throw new InvalidArgument('RoundedCorners param error, e.g: rounded-corners,r_30');
    }

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'r') {
        const r = Number.parseInt(v, 10);
        if (is.inRange(r, 1, 4096)) {
          opt.r = r;
        } else {
          throw new InvalidArgument('RoundedCorners param \'r\' must be between 1 and 4096');
        }
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }

    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    const metadata = await ctx.image.metadata();
    if (metadata.width && metadata.height) {
      const rbox = Buffer.from(`<svg viewBox="0 0 ${metadata.width} ${metadata.height}">
        <rect width="${metadata.width}" height="${metadata.height}" rx="${opt.r}" />
      </svg>`);
      ctx.image.composite([
        { input: rbox, blend: 'dest-in' },
      ]);
    } else {
      throw new InvalidArgument('Can\'t read image\'s width and height');
    }
  }
}