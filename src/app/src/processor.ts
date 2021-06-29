export interface IProcessor {
  readonly name: string;
  register(action: IAction): void;
  process(actions: string[]): void;
}

export interface IAction {
  readonly name: string;

  process(): void;
}

export interface IImageAction extends IAction {

}

export class ImageProcessor implements IProcessor {
  public static getInstance(): ImageProcessor {
    if (!ImageProcessor._instance) {
      ImageProcessor._instance = new ImageProcessor();
    }
    return ImageProcessor._instance;
  }
  private static _instance: ImageProcessor;
  private _registeredActions: {[name: string]: IAction} = {};
  public readonly name: string = 'image';

  private constructor() {}

  public process(actions: string[]): void {
    actions = actions.filter(act => act); // remove empty
    for (const action of actions) {
      if (this.name === action) {
        continue;
      }

      // "<action>,<param1>,<param2>,..."
      const parts = action.split(',');
      const name = parts[0];
      const act = this.getAction(name);
      if (!act) {
        throw new Error(`Unkown action: "${name}"`);
      }
    }
  }

  public getAction(name: string): IAction {
    return this._registeredActions[name];
  }

  public register(action: IImageAction): void {
    if (!this._registeredActions[action.name]) {
      this._registeredActions[action.name] = action;
    }
  }
}