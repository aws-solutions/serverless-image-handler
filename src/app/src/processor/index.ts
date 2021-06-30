export interface IProcessContext {}
export interface IProcessor {
  readonly name: string;
  register(action: IAction): void;
  process(ctx: IProcessContext, actions: string[]): void;
}

export interface IActionOpts {}
export interface IAction {
  readonly name: string;
  validate(params: string[]): IActionOpts;
  process(ctx: IProcessContext, params: string[]): void;
}