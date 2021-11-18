import * as sharp from 'sharp';
import { IImageAction, IImageContext } from '.';
import { IActionOpts, ReadOnly, InvalidArgument } from '..';

export interface WatermarkOpts extends IActionOpts {
  text: string;
  t: number; // 不透明度
  g: string; // 位置
  fill: boolean; // 文字是否重复
  rotate: number; // 文字旋转角度
  size: number; // 文字大小
  color: string; // 文字颜色
  image: string; // img 水印URL
  auto: boolean; // 自动调整水印图片大小以适应背景

}

interface WatermarkTextOpts extends IActionOpts {
  width: number;
  height: number;
}

export class WatermarkAction implements IImageAction {
  public readonly name: string = 'watermark';

  public validate(params: string[]): ReadOnly<WatermarkOpts> {
    let opt: WatermarkOpts = { text: '', t: 100, g: 'se', fill: false, rotate: 0, size: 40, color: '000000', image: '', auto: true };

    for (const param of params) {
      if ((this.name === param) || (!param)) {
        continue;
      }
      const [k, v] = param.split('_');
      if (k === 'text') {
        if ('' !== v) {
          const buff = Buffer.from(v, 'base64');
          opt.text = buff.toString('utf-8');
        }
      } else if (k === 'image') {
        if ('' !== v) {
          const buff = Buffer.from(v, 'base64');
          opt.image = buff.toString('utf-8');
        }
      } else if (k === 't') {
        opt.t = Number.parseInt(v, 10);
      } else if (k === 'g') {
        opt.g = this.gravityConvert(v);
      } else if (k === 'size') {
        const size = Number.parseInt(v, 10);
        if (0 < size && 1000 > size) {
          opt.size = size;
        } else {
          throw new InvalidArgument('Watermark param \'size\' must be between 0 and 1000');
        }

      } else if (k === 'fill') {
        if (v && (v === '0' || v === '1')) {
          opt.fill = (v === '1');
        } else {
          throw new InvalidArgument('Watermark param \'fill\' must be 0 or 1');
        }
      } else if (k === 'auto') {
        if (v && (v === '0' || v === '1')) {
          opt.auto = (v === '1');
        } else {
          throw new InvalidArgument('Watermark param \'auto\' must be 0 or 1');
        }
      } else if (k === 'rotate') {
        const rotate = Number.parseInt(v, 10);
        if (0 <= rotate && 360 >= rotate) {
          if (rotate === 360) {
            opt.rotate = 0;
          } else {
            opt.rotate = rotate;
          }
        } else {
          throw new InvalidArgument('Watermark param \'rotate\' must be between 0 and 360');
        }

      } else if (k === 'color') {
        opt.color = v;
      } else {
        throw new InvalidArgument(`Unkown param: "${k}"`);
      }
    }
    if ('' === opt.text && '' === opt.image) {
      throw new InvalidArgument('Watermark param \'text\' and \'image\' should not be empty at the same time');
    }

    if ('' !== opt.text && '' !== opt.image) {
      throw new InvalidArgument('Does not support text and image watermark at the same time in this version');
    }

    return opt;
  }


  public async process(ctx: IImageContext, params: string[]): Promise<void> {
    const opt = this.validate(params);
    if (opt.text !== '') {
      await this.textWaterMark(ctx, opt);
    } else {
      await this.imgWaterMark(ctx, opt);
    }
  }

  async textWaterMark(ctx: IImageContext, opt: WatermarkOpts): Promise<void> {
    const textOpt = this.calculateTextSize(opt.text, opt.size);
    const svg = this.textSvgStr(opt, textOpt);
    const svgBytes = Buffer.from(svg);

    if (0 < opt.rotate) {
      // hard to rotate the svg directly, so attach it on image, then rotate the image
      const overlapImg = this.textSvgImg(svgBytes, textOpt);

      const overlapImgBuffer = await overlapImg.png().toBuffer();
      let optOverlapImg = sharp(overlapImgBuffer).png();
      if (0 < opt.rotate) {
        optOverlapImg = optOverlapImg.rotate(opt.rotate, { background: '#00000000' });
      }

      optOverlapImg = await this.autoResizeImg(optOverlapImg, ctx, opt, textOpt);

      const rotateOverlabImgBuffer = await optOverlapImg.toBuffer();
      ctx.image.composite([{ input: rotateOverlabImgBuffer, tile: opt.fill, gravity: opt.g }]);
    } else {
      const bt = await this.autoResizeSvg(svgBytes,ctx,opt, textOpt);
      ctx.image.composite([{ input: bt, tile: opt.fill, gravity: opt.g }]);
    }
  }

  async imgWaterMark(ctx: IImageContext, opt: WatermarkOpts): Promise<void> {
    const bs = ctx.bufferStore;

    const watermarkImgBuffer = (await bs.get(opt.image)).buffer;
    let watermarkImg = sharp(watermarkImgBuffer).png();


    if (opt.t < 100) {
      watermarkImg = watermarkImg.removeAlpha().ensureAlpha(opt.t / 100);
    }

    if (0 < opt.rotate) {
      watermarkImg = sharp(await watermarkImg.toBuffer());
      const bt = await watermarkImg.rotate(opt.rotate, { background: '#ffffff00' }).toBuffer();
      watermarkImg = sharp(bt);
    }
    // auto scale warkmark size
    if (opt.auto) {
      // check the warkmark image size, if bigger than backgroud image, need resize the overlay
      const metadata = await ctx.image.metadata();
      const markMetadata = await watermarkImg.metadata();
      let width = markMetadata.width;
      let height = markMetadata.height;
      let needResize = false;

      if (markMetadata.width !== undefined && metadata.width !== undefined && markMetadata.width > metadata.width) {
        width = metadata.width - 1;
        needResize = true;
      }

      if (markMetadata.height !== undefined && metadata.height !== undefined && markMetadata.height > metadata.height) {
        height = metadata.height - 1;
        needResize = true;
      }
      if (needResize) {
        watermarkImg = watermarkImg.resize(width,height);
      }
    }
    const bt = await watermarkImg.toBuffer();
    ctx.image.composite([{ input: bt, tile: opt.fill, gravity: opt.g }]);
  }

  gravityConvert(param: string): string {
    if (['north', 'west', 'east', 'south', 'center', 'centre', 'southeast', 'southwest', 'northwest'].includes(param)) {
      return param;
    } else if (param === 'se') {
      return 'southeast';
    } else if (param === 'sw') {
      return 'southwest';
    } else if (param === 'nw') {
      return 'northwest';
    } else if (param === 'ne') {
      return 'northeast';
    } else {
      throw new InvalidArgument('Watermark param \'g\' must be in \'north\', \'west\', \'east\', \'south\', \'center\', \'centre\', \'southeast\', \'southwest\', \'northwest\'');
    }
  }

  calculateTextSize(text: string, fontSize: number): WatermarkTextOpts {
    const margin = 20;
    let cWidth = 0;
    for (let v of text) {
      const charCode = v.charCodeAt(0);
      if (charCode > 256) {
        cWidth += fontSize;
      } else if (charCode > 97) {
        cWidth += fontSize / 2;
      } else {
        cWidth += fontSize * 0.8;
      }
    }
    return {
      width: Math.round(cWidth + margin),
      height: Math.round(fontSize * 1.4),
    };
  }
  textSvgStr(opt: WatermarkOpts, textOpt: WatermarkTextOpts): string {
    const xOffset = Math.round(textOpt.width / 2);
    const yOffset = Math.round(textOpt.height * 0.8);
    const color = `#${opt.color}`;
    const opacity = opt.t / 100;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${textOpt.width} ${textOpt.height}" text-anchor="middle">
    <text font-size='${opt.size}'  x="${xOffset}" y="${yOffset}" fill="${color}" opacity="${opacity}">${opt.text}</text>
    </svg>`;
    return svg;
  }

  textSvgImg(svgBytes: Buffer, textOpt: WatermarkTextOpts): sharp.Sharp {
    const overlapImg = sharp({
      create: {
        width: textOpt.width + 10,
        height: textOpt.height + 10,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite([{ input: svgBytes }]);

    return overlapImg;
  }

  async autoResizeImg(source: sharp.Sharp, ctx: IImageContext, opt: WatermarkOpts, textOpt: WatermarkTextOpts): Promise<sharp.Sharp> {
    if (opt.auto) {

      let w = textOpt.width;
      let h = textOpt.height;
      let needResize = false;
      const overlapImgMeta = await source.metadata();
      const metadata = await ctx.image.metadata();

      if (overlapImgMeta.width !== undefined && metadata.width !== undefined && overlapImgMeta.width > metadata.width) {
        w = metadata.width - 10;
        needResize = true;
      }
      if (overlapImgMeta.height !== undefined && metadata.height !== undefined && overlapImgMeta.height > metadata.height) {
        h = metadata.height - 10;
        needResize = true;
      }

      if (needResize) {
        const overlapImgBuffer = await source.toBuffer();
        source = sharp(overlapImgBuffer);
        source = source.resize(w, h);
      }
    }
    return source;

  }

  async autoResizeSvg(source: Buffer, ctx: IImageContext, opt: WatermarkOpts, textOpt: WatermarkTextOpts): Promise<Buffer> {
    let bt = source;

    if (opt.auto) {
      const metadata = await ctx.image.metadata();
      let w = textOpt.width;
      let h = textOpt.height;
      let needResize = false;
      if (metadata.width !== undefined && metadata.width < textOpt.width) {
        w = metadata.width;
        needResize = true;
      }
      if (metadata.height !== undefined && metadata.height < textOpt.height) {
        h = metadata.height;
        needResize = true;
      }
      if (needResize) {
        // hard to resize the svg directly, so attach it on image, then resize the image
        let overlapImg = this.textSvgImg(bt, textOpt);
        const overlapImgBuffer = await overlapImg.png().toBuffer();
        overlapImg = sharp(overlapImgBuffer).png();
        overlapImg = overlapImg.resize(w, h);
        bt = await overlapImg.toBuffer();
      }
    }
    return bt;
  }
}