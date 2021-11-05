import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import * as is from '../../is';

export interface BrightOpts extends IActionOpts {
  bright: number;
}

export class BrightAction implements IImageAction {
  public readonly name: string = 'bright';

  public validate(params: string[]): ReadOnly<BrightOpts> {
    const opt: BrightOpts = { bright: 100 };

    if (params.length !== 2) {
      throw new InvalidArgument('Bright param error, e.g: bright,50');
    }
    const b = Number.parseInt(params[1], 10);
    if (is.inRange(b, -100, 100)) {
      opt.bright = b;
    } else {
      throw new InvalidArgument('Bright must be between -100 and 100');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    ctx.image.linear(1, opt.bright);
  }
}