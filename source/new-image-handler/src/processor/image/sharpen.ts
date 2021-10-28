import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface SharpenOpts extends IActionOpts {
  sharpen: number;
}

export class SharpenAction implements IImageAction {
  public readonly name: string = 'sharpen';

  public validate(params: string[]): ReadOnly<SharpenOpts> {
    const opt: SharpenOpts = { sharpen: 0 };

    if (params.length !== 2) {
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
    ctx.image.sharpen(opt.sharpen / 100, 0.5, 1);
  }
}