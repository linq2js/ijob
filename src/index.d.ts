export interface DefaultExport {
  /**
   * get current job
   */
  (): Job<any>;
  /**
   * create new job
   * @param func
   */
  <T>(func: JobFunc<T>): Job<T>;
  /**
   * create new job
   * @param func
   */
  <T>(func: JobFunc<Promise<T>>): Job<T>;
  func(func: Function): WrappedJob;
  latest(func: Function): WrappedJob;
  throttle(ms: number, func: Function): WrappedJob;
  debounce(ms: number, func: Function): WrappedJob;
}

export interface WrappedJob {
  subscribe(subscription: Subscription): Unsubscribe;
}

export type Subscription = (args: ChangeArgs) => any;

export interface ChangeArgs {
  state: 'loading' | 'hasValue' | 'hasError' | 'cancelled';
  value: any;
  error: Error;
}

export interface JobBase {
  cancel(): void;
  onCancel(listener: Listener): Unsubscribe;
  onDone(listener: Listener): Unsubscribe;
  onSuccess(listener: Listener): Unsubscribe;
  onError(listener: Listener): Unsubscribe;
}

export interface JobContext extends JobBase {
  wrap<T extends Function>(func: T): T;
  wrap(funcs: Function[]): Function[];
}

export interface Job<T> extends Promise<T>, JobBase {}

export type JobFunc<T> = (context: JobContext) => T;

export type Listener = () => any;

export type Unsubscribe = () => void;

export class CancelError extends Error {}

declare const ijob: DefaultExport;

export default ijob;
