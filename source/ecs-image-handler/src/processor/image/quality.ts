import * as sharp from 'sharp';
import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';


const JPG = 'jpg';
const JPEG = sharp.format.jpeg.id;
const WEBP = sharp.format.webp.id;

export interface QualityOpts extends IActionOpts {
  q?: number;
  Q?: number;
}

export class QualityAction implements IImageAction {
  public readonly name: string = 'quality';

  public validate(params: string[]): ReadOnly<QualityOpts> {
    const opt: QualityOpts = {};
    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'q') {
        const q = parseInt(v);
        if (inRange(q, 1, 100)) {
          opt.q = q;
        } else {
          throw new InvalidArgument('Quality must be between 1 and 100');
        }
      } else if (k === 'Q') {
        const Q = parseInt(v);
        if (inRange(Q, 1, 100)) {
          opt.Q = Q;
        } else {
          throw new InvalidArgument('Quality must be between 1 and 100');
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

    // NOTE: It seems that ImageMagick can detect pictures quality https://superuser.com/questions/62730/how-to-find-the-jpg-quality
    // while Sharp.js can not. For simplicity, we just use absolute quality at here.

    if (JPEG === metadata.format || JPG === metadata.format) {
      ctx.image.jpeg({ quality: opt.q ?? opt.Q });
    } else if (WEBP === metadata.format) {
      ctx.image.webp({ quality: opt.q ?? opt.Q });
    }
  }
}