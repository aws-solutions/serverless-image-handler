import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface RotateOpts extends IActionOpts {
  degree: number;
}

export class RotateAction implements IImageAction {
  public readonly name: string = 'rotate';

  public validate(params: string[]): ReadOnly<RotateOpts> {
    var opt: RotateOpts = { degree: 0 };

    if ( params.length != 2) {
      throw new InvalidArgument('Rotate param error, e.g: rotate,90');
    }
    const d = parseInt(params[1]);
    if (inRange(d, 0, 360)) {
      opt.degree = d;
    } else {
      throw new InvalidArgument('Rotate must be between 0 and 360');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    // console.log(`roate degree =${opt.degree} `);
    ctx.image.rotate(opt.degree);
  }
}