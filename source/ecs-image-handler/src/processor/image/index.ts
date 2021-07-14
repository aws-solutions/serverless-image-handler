import * as sharp from 'sharp';
import { IAction, InvalidArgument, IProcessContext, IProcessor } from '../../processor';
import { IKVStore, MemKVStore } from '../../store';
import { QualityAction } from './quality';
import { ResizeAction } from './resize';

export interface IImageAction extends IAction {}

export interface IImageContext extends IProcessContext {
  image: sharp.Sharp;
}
export class ImageProcessor implements IProcessor {
  public static getInstance(): ImageProcessor {
    if (!ImageProcessor._instance) {
      ImageProcessor._instance = new ImageProcessor();
    }
    return ImageProcessor._instance;
  }
  private static _instance: ImageProcessor;
  private readonly _actions: {[name: string]: IAction} = {};

  public readonly name: string = 'image';

  private constructor() {}

  public async process(ctx: IImageContext, actions: string[]): Promise<void> {
    if (!ctx.image) {
      throw new InvalidArgument('Invalid image context');
    }
    for (const action of actions) {
      if ((this.name === action) || (!action)) {
        continue;
      }

      // "<action-name>,<param-1>,<param-2>,..."
      const params = action.split(',');
      const name = params[0];
      const act = this.action(name);
      if (!act) {
        throw new InvalidArgument(`Unkown action: "${name}"`);
      }
      await act.process(ctx, params);
    }
  }

  public action(name: string): IAction {
    return this._actions[name];
  }

  public register(...actions: IImageAction[]): void {
    for (const action of actions) {
      if (!this._actions[action.name]) {
        this._actions[action.name] = action;
      }
    }
  }
}

// Register actions
ImageProcessor.getInstance().register(
  new ResizeAction(),
  new QualityAction(),
);

export class StyleProcessor implements IProcessor {
  public static getInstance(kvstore?: IKVStore): StyleProcessor {
    if (!StyleProcessor._instance) {
      StyleProcessor._instance = new StyleProcessor();
    }
    if (kvstore) {
      StyleProcessor._instance._kvstore = kvstore;
    }
    return StyleProcessor._instance;
  }
  private static _instance: StyleProcessor;

  public readonly name: string = 'style';
  private _kvstore: IKVStore = new MemKVStore({});

  private constructor() {}

  public async process(ctx: IImageContext, actions: string[]): Promise<void> {
    if (!ctx.image) {
      throw new InvalidArgument('Invalid style context');
    }
    if (actions.length != 2) {
      throw new InvalidArgument('Invalid style name');
    }
    const stylename = actions[1];
    if (!stylename.match(/^[\w\-_\.]{1,63}$/)) {
      throw new InvalidArgument('Invalid style name');
    }
    const { style } = await this._kvstore.get(stylename);
    if (style && (typeof style === 'string' || style instanceof String)) {
      await ImageProcessor.getInstance().process(ctx, style.split('/').filter(x => x));
    } else {
      throw new InvalidArgument('Style not found');
    }
  }

  public register(..._: IAction[]): void {}
}
