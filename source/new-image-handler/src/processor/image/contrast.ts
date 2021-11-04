import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import * as is from '../../is';

export interface ContrastOpts extends IActionOpts {
  contrast: number;
}

export class ContrastAction implements IImageAction {
  public readonly name: string = 'contrast';

  public validate(params: string[]): ReadOnly<ContrastOpts> {
    const opt: ContrastOpts = { contrast: -100 };

    if (params.length !== 2) {
      throw new InvalidArgument('Contrast param error, e.g: contrast,-50');
    }
    const b = Number.parseInt(params[1], 10);
    if (is.inRange(b, -100, 100)) {
      opt.contrast = b;
    } else {
      throw new InvalidArgument('Contrast must be between -100 and 100');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    if (opt.contrast > 0) {
      ctx.image.linear((2 * opt.contrast + 100) / 200 + 0.5);
    } else {
      ctx.image.linear((opt.contrast + 100) / 200 + 0.5);
    }
  }
}