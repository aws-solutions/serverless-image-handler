import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import * as is from '../../is';

export interface BlurOpts extends IActionOpts {
  r: number;
  s: number;
}

export class BlurAction implements IImageAction {
  public readonly name: string = 'blur';

  public validate(params: string[]): ReadOnly<BlurOpts> {
    let opt: BlurOpts = { r: 0, s: 0 };

    if (params.length < 2) {
      throw new InvalidArgument('blur param error, e.g: blur,r_3,s_2');
    }

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'r') {
        const r = Number.parseInt(v, 10);
        if (is.inRange(r, 0, 50)) {
          opt.r = r;
        } else {
          throw new InvalidArgument('Blur param \'r\' must be between 0 and 50');
        }
      } else if (k === 's') {
        const s = Number.parseInt(v, 10);
        if (is.inRange(s, 0, 50)) {
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
    const a = -0.0057;
    const b = 1.1787;
    const c = -0.0694;
    const sigma = a * opt.s * opt.s + b * opt.s + c;

    ctx.image.blur(sigma);
  }
}