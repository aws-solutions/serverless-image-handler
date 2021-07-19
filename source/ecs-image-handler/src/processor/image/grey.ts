import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface GreyOpts extends IActionOpts {
  grey: number;
}

export class GreyAction implements IImageAction {
  public readonly name: string = 'grey';

  public validate(params: string[]): ReadOnly<GreyOpts> {
    var opt: GreyOpts = { grey: 0 };

    if ( params.length != 2) {
      throw new InvalidArgument('Grey param error, e.g: grey,1');
    }
    const s = parseInt(params[1]);
    if (inRange(s, 0, 1)) {
      opt.grey = s;
    } else {
      throw new InvalidArgument('Grey must be 0 or 1');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    if (opt.grey == 1) {
      ctx.image.greyscale();
    }

  }
}