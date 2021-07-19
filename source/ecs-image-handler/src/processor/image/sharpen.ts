import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface SharpenOpts extends IActionOpts {
  sharpen: number;
}

export class SharpenAction implements IImageAction {
  public readonly name: string = 'sharpen';

  public validate(params: string[]): ReadOnly<SharpenOpts> {
    var opt: SharpenOpts = { sharpen: 0 };

    if ( params.length != 2) {
      throw new InvalidArgument('Sharpen param error, e.g: sharpen,100');
    }
    const s = parseInt(params[1]);
    if (inRange(s, 50, 399)) {
      opt.sharpen = s;
    } else {
      throw new InvalidArgument('Sharpen be between 50 and 399');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    //NOTE: Ali sharpen config range from 50 to 399, default 100
    //  Ali oss           SharpJs
    // [50, 100)   ->    [0.01, 1)
    // [100, 399]  ->    [1, 300]
    // SharpJs sharpen config number between 0.01 and 10000

    var s = 1.0;
    if (opt.sharpen >=100) {
      s = opt.sharpen - 99;
    } else {
      s = (opt.sharpen - 50) * (1-0.01) /(100 - 50) + 0.01;
    }
    // console.log(`raw sharpen =${opt.sharpen} SharpJs sharpen=${s}`);
    ctx.image.sharpen(s);


  }
}