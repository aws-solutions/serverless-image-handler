import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface BlurOpts extends IActionOpts {
  r: number;
  s: number;
}

export class BlurAction implements IImageAction {
  public readonly name: string = 'blur';

  public validate(params: string[]): ReadOnly<BlurOpts> {
    var opt: BlurOpts = { r: 0, s: 0 };

    if ( params.length <2) {
      throw new InvalidArgument('blur param error, e.g: blur,r_3,s_2');
    }

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'r') {
        const r = parseInt(v);
        if (inRange(r, 0, 50)) {
          opt.r = r;
        } else {
          throw new InvalidArgument('Blur param \'r\' must be between 0 and 50');
        }
      } else if (k === 's') {
        const s = parseInt(v);
        if (inRange(s, 0, 50)) {
          opt.s = s;
        } else {
          throw new InvalidArgument('Blur param \'s\' must be between 0 and 50');
        }
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }

    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    const sums = opt.r + opt.s;
    //NOTE: Ali blur config range from s 0 to 50 , r 0 to 50 ,
    // SharpJs blur config range from 0.3 to 1000.
    const blur = 50 * sums /100 + 0.3;
    console.log(` raw blur=${sums}  d=${blur} `);
    ctx.image.blur(blur);
  }
}