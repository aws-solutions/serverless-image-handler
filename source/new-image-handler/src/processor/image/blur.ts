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

    const sqrtln01 = 1.51743; // Sqrt(-ln(0.1))
    const max_x = Math.floor(sigma * sqrtln01);
    const max_n = 2 * Math.max(max_x - 1, 0) + 1; // The max gauss kernel size
    const n = 2 * opt.r + 1; // The given gauss kernel size

    if ((n < max_n) && (n <= 51)) { // It will be really slow if n > 51
      console.log('Use manual blur');
      ctx.image.convolve({
        width: n,
        height: n,
        kernel: gaussmat(n, sigma),
      });
    } else {
      console.log('Use built-in blur');
      ctx.image.blur(sigma);
    }
  }
}

function gaussmat(n: number, sigma: number): ArrayLike<number> {
  if (n % 2 === 0) {
    throw new Error('gaussmat kernel size must be odd');
  }
  const mat = new Array<number>(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // eslint-disable-next-line no-bitwise
      let xo = x - (n >> 1);
      // eslint-disable-next-line no-bitwise
      let yo = y - (n >> 1);
      const distance = xo * xo + yo * yo;
      const v = Math.exp(-distance / (sigma * sigma));
      mat[y * n + x] = v;
    }
  }
  return mat;
}