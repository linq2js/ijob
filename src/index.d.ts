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

  latest<T extends Function>(func: T): T;
  throttle<T extends Function>(ms: number, func: T): T;
  debounce<T extends Function>(ms: number, func: T): T;
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
