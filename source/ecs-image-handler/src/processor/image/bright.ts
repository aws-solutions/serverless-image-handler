import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';
import { inRange } from './utils';

export interface BrightOpts extends IActionOpts {
  bright: number;
}

export class BrightAction implements IImageAction {
  public readonly name: string = 'bright';

  public validate(params: string[]): ReadOnly<BrightOpts> {
    var opt: BrightOpts = { bright: 100 };

    if ( params.length != 2) {
      throw new InvalidArgument('Bright param error, e.g: bright,50');
    }
    const b = parseInt(params[1]);
    if (inRange(b, -100, 100)) {
      opt.bright = b;
    } else {
      throw new InvalidArgument('Bright must be between -100 and 100');
    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    //NOTE: Ali bright config range from -100 to 100, SharpJs bright config range from 0.5(baseBright) to 1.
    var baseBirght = 0.3;
    const d = 1/ baseBirght;
    const range = (( d+1) * 100)/(d-1) ;
    var bright = (opt.bright + range) / (range + 100);

    // console.log(` baseBirght=${baseBirght}  d=${d}  range=${range}  bright=${bright}`);
    ctx.image.modulate({
      brightness: bright,
    });
  }
}