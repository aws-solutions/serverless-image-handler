import * as HttpErrors from 'http-errors';
import { IBufferStore } from '../store';

/**
 * A utility to make an object immutable.
 */
export type ReadOnly<T> = {
  readonly [K in keyof T]: ReadOnly<T[K]>;
}

/**
 * Context object for processor.
 */
export interface IProcessContext {

  /**
   * A abstract store to get file data.
   * It can either get from s3 or local filesystem.
   */
  readonly bufferStore: IBufferStore;
}

/**
 * Processor interface.
 */
export interface IProcessor {

  /**
   * The name of the processor.
   */
  readonly name: string;

  /**
   * Register action handlers for the processor.
   *
   * @param actions the action handlers
   */
  register(...actions: IAction[]): void;

  /**
   * Process each actions with a context.
   *
   * For example:
   *
   * ```ts
   * const image = sharp({
   *   create: {
   *     width: 50,
   *     height: 50,
   *     channels: 3,
   *     background: { r: 255, g: 0, b: 0 },
   *   },
   * });
   * const ctx = { image, store: new NullStore() };
   * await ImageProcessor.getInstance().process(ctx, 'image/resize,w_100,h_100,m_fixed,limit_0/'.split('/'));
   * ```
   *
   * @param ctx the context
   * @param actions the actions
   */
  process(ctx: IProcessContext, actions: string[]): Promise<void>;
}

/**
 * An interface of action options.
 */
export interface IActionOpts {}

/**
 * An interface of action.
 */
export interface IAction {

  /**
   * The name of the action.
   */
  readonly name: string;

  /**
   * Validate parameters and return an action option object.
   * Throw an error if it's invalid.
   *
   * For example:
   *
   * ```ts
   * action.validate('resize,m_mfit,h_100,w_100,,'.split(',');
   * ````
   *
   * @param params the parameters
   */
  validate(params: string[]): ReadOnly<IActionOpts>;

  /**
   * Process the action with the given parameters.
   *
   * For example:
   *
   * ```ts
   * action.process(ctx, 'resize,w_10,h_10'.split(','));
   * ```
   *
   * @param ctx the context
   * @param params the parameters
   */
  process(ctx: IProcessContext, params: string[]): Promise<void>;
}

/**
 * Invalid argument error (HTTP 400).
 */
export class InvalidArgument extends HttpErrors[400] {}
