import { Metadata } from 'sharp';
import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';

export interface CropOpts extends IActionOpts {
  w: number;
  h: number;
  x: number;
  y: number;
  g: string;
}

export class CropAction implements IImageAction {
  public readonly name: string = 'crop';

  public validate(params: string[]): ReadOnly<CropOpts> {
    var opt: CropOpts = { w: 0, h: 0, x: 0, y: 0, g: 'nw' };

    if ( params.length <2) {
      throw new InvalidArgument('Crop param error, e.g: crop,x_100,y_50');
    }

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'w') {
        const w = parseInt(v);
        if ( w>0 ) {
          opt.w = w;
        } else {
          throw new InvalidArgument('Crop param \'w\' must be greater than  0');
        }
      } else if (k === 'h') {
        const h = parseInt(v);
        if ( h>0 ) {
          opt.h = h;
        } else {
          throw new InvalidArgument('Crop param \'h\' must be greater than  0');
        }
      } else if (k === 'x') {
        const x = parseInt(v);
        if (x>=0) {
          opt.x = x;
        } else {
          throw new InvalidArgument('Crop param \'x\' must be greater than or equal to 0');
        }
      } else if (k === 'y') {
        const y = parseInt(v);
        if (y>=0) {
          opt.y = y;
        } else {
          throw new InvalidArgument('Crop param \'y\' must be greater than or equal to 0');
        }
      } else if (k === 'g') {
        if (v == 'nw' || v =='north' || v =='ne' ||
           v == 'west' || v =='center' || v =='east' ||
           v == 'sw' || v =='south' || v =='se' ) {
          opt.g = v;
        } else {
          throw new InvalidArgument('Crop param \'g\' must be  \'nw, north, ne, west, center, east, sw, south, se\'');
        }
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }

    }
    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    console.log(opt);

    var height = opt.h;
    var width = opt.w;
    var x = opt.x;
    var y = opt.y;


    await ctx.image.metadata()
      .then(function(metadata: Metadata) {
        console.log(metadata);

        if (metadata.height == undefined || metadata.width == undefined) {
          throw new InvalidArgument('Incorrect image format');
        }

        /** ge
         *   v == 'nw'    || v =='north'    || v =='ne'
             v == 'west'  || v =='center'   || v =='east'
             v == 'sw'    || v =='south'    || v =='se'
        */

        if (opt.g === 'west' || opt.g === 'center' || opt.g =='east') {
          y += Math.round(metadata.height / 3);
        } else if (opt.g =='sw' || opt.g == 'south' || opt.g =='se') {
          y += Math.round(metadata.height / 3) * 2;
        }

        if (opt.g =='north' || opt.g == 'center' || opt.g =='south') {
          x += Math.round(metadata.width / 3);
        } else if (opt.g =='ne' || opt.g == 'east' || opt.g =='se') {
          x += Math.round(metadata.width / 3) * 2;
        }

        if (x >= metadata.width) {
          throw new InvalidArgument(`Incorrect crop param, 'x' value must be less than the image width(${metadata.width}) `);
        }
        if (y >= metadata.height ) {
          throw new InvalidArgument(`Incorrect crop param, 'y' value must be less than the image height(${metadata.height}) `);
        }

        // The width and height are not set in the parameter, modify them to reasonable values
        if (width == 0) {
          width = metadata.width - x;
        }
        if (height == 0) {
          height = metadata.height - y;
        }

        //The width and height of the set parameters exceed the size of the picture, modify them to reasonable values
        if (x + width > metadata.width) {
          width = metadata.width - x;
        }
        if (y + height > metadata.height ) {
          height = metadata.height - y;
        }

        // console.log(`x=${x}  y=${y} w=${width}  h=${height} g=${opt.g}`);
      });


    ctx.image.extract({ left: x, top: y, width: width, height: height });
  }
}