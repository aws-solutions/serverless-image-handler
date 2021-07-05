import * as sharp from 'sharp';
import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidInput } from '..';
import { isHexColor } from './utils';

export const enum Mode {
  LFIT = 'lfit',
  MFIT = 'mfit',
  FILL = 'fill',
  PAD = 'pad',
  FIXED = 'fixed'
}

export interface ResizeOpts extends IActionOpts {
  m?: Mode;
  w?: number;
  h?: number;
  l?: number;
  s?: number;
  limit?: boolean;
  color?: string;
}

export class ResizeAction implements IImageAction {
  public readonly name: string = 'resize';

  public validate(params: string[]): ReadOnly<ResizeOpts> {
    const opt: ResizeOpts = {
      m: Mode.LFIT,
      limit: true,
      color: '#FFFFFF',
    };
    for (const p of params) {
      if ((this.name === p) || (!p)) {
        continue;
      }
      const [k, v] = p.split('_');
      if (k === 'w') {
        opt.w = parseInt(v);
      } else if (k === 'h') {
        opt.h = parseInt(v);
      } else if (k === 'm') {
        if (v && ((v === Mode.LFIT) || (v === Mode.MFIT) || (v === Mode.FILL) || (v === Mode.PAD) || (v === Mode.FIXED))) {
          opt.m = v;
        } else {
          throw new InvalidInput(`Unkown m: "${v}"`);
        }
      } else if (k === 'limit') {
        if (v && (v === '0' || v === '1')) {
          opt.limit = (v === '1');
        } else {
          throw new InvalidInput(`Unkown limit: "${v}"`);
        }
      } else if (k === 'color') {
        const color = '#' + v;
        if (isHexColor(color)) {
          opt.color = color;
        } else {
          throw new InvalidInput(`Unkown color: "${v}"`);
        }
      } else {
        throw new InvalidInput(`Unkown param: "${k}"`);
      }
    }
    return opt;
  }
  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const o = this.validate(params);
    const opt: sharp.ResizeOptions = {
      width: o.w,
      height: o.h,
      withoutEnlargement: o.limit,
      background: o.color,
    };
    // Mode
    if (o.m === Mode.LFIT) {
      opt.fit = sharp.fit.inside;
    } else if (o.m === Mode.MFIT) {
      opt.fit = sharp.fit.outside;
    } else if (o.m === Mode.FILL) {
      opt.fit = sharp.fit.cover;
    } else if (o.m === Mode.PAD) {
      opt.fit = sharp.fit.contain;
    } else if (o.m === Mode.FIXED) {
      opt.fit = sharp.fit.fill;
    }
    ctx.image = ctx.image.resize(null, null, opt);
  }
}