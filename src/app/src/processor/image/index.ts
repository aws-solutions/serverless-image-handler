import * as sharp from 'sharp';
import { IAction, IProcessContext, IProcessor } from '../../processor';
import { ImageResizeAction } from './resize';

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
  private readonly _registeredActions: {[name: string]: IAction} = {};

  public readonly name: string = 'image';

  private constructor() {}

  public process(ctx: IImageContext, actions: string[]): void {
    if (!ctx.image) {
      throw new Error('Invalid image context');
    }
    for (const action of actions) {
      if ((this.name === action) || (!action)) {
        continue;
      }

      // "<action-name>,<param-1>,<param-2>,..."
      const parts = action.split(',');
      const name = parts[0];
      const act = this.action(name);
      if (!act) {
        throw new Error(`Unkown action: "${name}"`);
      }
      act.process(ctx, parts);
    }
  }

  public action(name: string): IAction {
    return this._registeredActions[name];
  }

  public register(action: IImageAction): void {
    if (!this._registeredActions[action.name]) {
      this._registeredActions[action.name] = action;
    }
  }
}

// Register actions
ImageProcessor.getInstance().register(new ImageResizeAction());