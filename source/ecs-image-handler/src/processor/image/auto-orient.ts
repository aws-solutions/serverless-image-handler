import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface AutoOrientOpts extends IActionOpts {
  auto: number;
}

export class AutoOrientAction implements IImageAction {
  public readonly name: string = 'auto-orient';

  public validate(params: string[]): ReadOnly<AutoOrientOpts> {
    var opt: AutoOrientOpts = { auto: 0 };

    if ( params.length != 2) {
      throw new InvalidArgument('Auto-orient param error, e.g: auto-orient,1');
    }
    const a = parseInt(params[1]);
    if (inRange(a, 0, 1)) {
      opt.auto = a;
    } else {
      throw new InvalidArgument('Auto-orient param must be 0 or 1');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    if (opt.auto == 1) {
      ctx.image.rotate();
    }

  }
}