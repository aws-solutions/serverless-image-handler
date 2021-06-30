import { IStore } from '../store';

export interface IProcessContext {
  store: IStore;
}
export interface IProcessor {
  readonly name: string;
  register(...actions: IAction[]): void;
  process(ctx: IProcessContext, actions: string[]): Promise<void>;
}

export interface IActionOpts {}
export interface IAction {
  readonly name: string;
  validate(params: string[]): IActionOpts;
  process(ctx: IProcessContext, params: string[]): Promise<void>;
}

export class InvalidInput extends Error {}