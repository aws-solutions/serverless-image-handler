import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';

export interface AutoOrientOpts extends IActionOpts {
  auto: boolean;
}

export class AutoOrientAction implements IImageAction {
  public readonly name: string = 'auto-orient';

  public validate(params: string[]): ReadOnly<AutoOrientOpts> {
    const opt: AutoOrientOpts = { auto: false };

    if (params.length !== 2) {
      throw new InvalidArgument('Auto-orient param error, e.g: auto-orient,1');
    }
    if (params[1] === '1') {
      opt.auto = true;
    } else if (params[1] === '0') {
      opt.auto = false;
    } else {
      throw new InvalidArgument('Auto-orient param must be 0 or 1');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    if (opt.auto) {
      ctx.image.rotate();
    }

  }
}