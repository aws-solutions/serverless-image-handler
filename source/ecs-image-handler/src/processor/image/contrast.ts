import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface ContrastOpts extends IActionOpts {
  contrast: number;
}

export class ContrastAction implements IImageAction {
  public readonly name: string = 'contrast';

  public validate(params: string[]): ReadOnly<ContrastOpts> {
    var opt: ContrastOpts = { contrast: -100 };

    if ( params.length != 2) {
      throw new InvalidArgument('Contrast param error, e.g: contrast,-50');
    }
    const b = parseInt(params[1]);
    if (inRange(b, -100, 100)) {
      opt.contrast = b;
    } else {
      throw new InvalidArgument('Contrast must be between -100 and 100');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    //NOTE: Ali contrast config range from -100 to 100, SharpJs contrast  range from 0(baseBright) to 100.
    const contrast = Math.floor(( opt.contrast + 100) /2);
    ctx.image.clahe({ width: 100, height: 100, maxSlope: contrast });
  }
}