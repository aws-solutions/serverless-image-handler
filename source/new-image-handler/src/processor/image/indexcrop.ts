import * as sharp from 'sharp';
import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';

export interface IndexCropOpts extends IActionOpts {
  x: number;
  y: number;
  i: number;
}

export class IndexCropAction implements IImageAction {
  public readonly name: string = 'indexcrop';

  public validate(params: string[]): ReadOnly<IndexCropOpts> {
    let opt: IndexCropOpts = { x: 0, y: 0, i: 0 };

    if (params.length < 3) {
      throw new InvalidArgument('IndexCrop param error, e.g: indexcrop,x_100,i_0');
    }

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'x') {
        opt.x = Number.parseInt(v, 10);
        if (opt.x < 0) {
          throw new InvalidArgument('Param error:  x value must be greater than 0');
        }
      } else if (k === 'y') {
        opt.y = Number.parseInt(v, 10);
        if (opt.y < 0) {
          throw new InvalidArgument('Param error:  y value must be greater than 0');
        }
      } else if (k === 'i') {
        opt.i = Number.parseInt(v, 10);
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }
    if (opt.x > 0 && opt.y > 0) {
      throw new InvalidArgument('Param error:  Cannot enter x and y at the same time');
    }

    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);

    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;
    let needCrop: boolean = true;

    const metadata = await sharp(await ctx.image.toBuffer()).metadata();
    if (metadata.height === undefined || metadata.width === undefined) {
      throw new InvalidArgument('Incorrect image format');
    }


    if (metadata.height === undefined || metadata.width === undefined) {
      throw new InvalidArgument('Incorrect image format');
    }
    h = metadata.height;
    w = metadata.width;

    if (opt.x > 0) {
      if (opt.x > metadata.width) {
        needCrop = false;
        return;
      }
      const count = Math.floor(metadata.width / opt.x);
      if (opt.i + 1 > count) {
        needCrop = false;
        return;
      }
      x = opt.i * opt.x;
      w = opt.x;

    } else if (opt.y > 0) {

      if (opt.y > metadata.height) {
        needCrop = false;
        return;
      }

      const count = Math.floor(metadata.height / opt.y);
      if (opt.i + 1 > count) {
        needCrop = false;
        return;
      }
      y = opt.i * opt.y;
      h = opt.y;

    }

    if (needCrop) {
      ctx.image = sharp(await ctx.image.extract({ left: x, top: y, width: w, height: h }).toBuffer());
    }

  }
}