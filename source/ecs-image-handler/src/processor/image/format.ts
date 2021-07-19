import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';

export interface FormatOpts extends IActionOpts {
  format: string;
}

export class FormatAction implements IImageAction {
  public readonly name: string = 'format';

  public validate(params: string[]): ReadOnly<FormatOpts> {
    var opt: FormatOpts = { format: '' };

    if ( params.length != 2) {
      throw new InvalidArgument('Format param error, e.g: format,jpg   (jpg,png,webp)');
    }
    opt.format = params[1];

    if (opt.format !== 'jpg' && opt.format !== 'png' && opt.format !== 'webp' ) {
      throw new InvalidArgument('Format must be one of \'jpg,png,webp\'');
    }

    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    //NOTE:  jpg,webp,png
    if (opt.format === 'jpg') {
      ctx.image.toFormat('jpg');
    } else if (opt.format === 'png') {
      ctx.image.toFormat('png');
    } else if (opt.format === 'webp') {
      ctx.image.toFormat('webp');
    }

  }
}