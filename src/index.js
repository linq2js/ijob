import iscope from 'iscope';

const jobScope = iscope(() => null);
const noop = () => {};

if (typeof Function.prototype.isGenerator == 'undefined') {
  Function.prototype.isGenerator = function () {
    return /^function\s*\*/.test(this.toString());
  };
}

export default function ijob(func) {
  if (!arguments.length) {
    return jobScope() || undefined;
  }

  let promise;
  let done = false;
  let cancelled = false;
  const parentContext = jobScope();
  const isDone = () => done;
  const isCancelled = () =>
    cancelled || (parentContext && parentContext.isCancelled());
  const emitter = createEmitter();
  const onCancel = (listener) => emitter.on('cancel', listener);
  const onError = (listener) => emitter.on('error', listener);
  const onSuccess = (listener) => emitter.on('success', listener);
  const onDone = (listener) => emitter.on('done', listener);
  const wrap = (funcs) =>
    (Array.isArray(funcs) ? funcs : [funcs]).map((func) => (...args) => {
      if (isCancelled()) {
        throw new CancelError();
      }
      return func(...args);
    });
  const context = {
    isCancelled,
    isDone,
    cancel(message) {
      cancel(message);
      throw new CancelError(message);
    },
    onCancel,
    onError,
    onSuccess,
    onDone,
    wrap,
  };
  const unsubscribes = [];
  const cleanup = () => {
    emitter.clear();
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
  const handleReject = (e) => {
    done = true;
    if (e instanceof CancelError) {
    } else {
      emitter.emit(['error', 'done'], e);
    }
    promise && promise.reject(e);
  };
  const cancel = (message) => {
    if (isCancelled()) {
      return;
    }
    forceCancel(message);
  };
  const forceCancel = (message) => {
    cancelled = true;
    const error = new CancelError(message);
    emitter.emit('cancel', error);
    promise && promise.reject(error);
  };
  // handle parent cancellation
  if (parentContext) {
    unsubscribes.push(
      parentContext.onCancel(() => {
        if (!cancelled) {
          forceCancel();
        }
        cleanup();
      }),
    );
  }
  // clean up
  context.onDone(cleanup);

  return Object.assign(
    new Promise(async (resolve, reject) => {
      promise = {resolve, reject};
      if (parentContext && parentContext.isCancelled()) {
        handleReject(new CancelError());
      }

      try {
        const finalResult = await jobScope(context, async () => {
          let result = await func(context);
          // is generator
          if (result && typeof result.next === 'function') {
            const iterator = result;
            let lastValue = undefined;
            while (true) {
              if (isCancelled()) {
                throw new CancelError();
              }
              const r = await iterator.next(lastValue);

              if (r.done) {
                return r.value;
              }
              if (r.value) {
                if (!Array.isArray(r.value)) {
                  throw new Error('A "yield expression" should be Array');
                }

                const [f, ...args] = r.value;
                lastValue = await f(...args);
              }
            }
          }

          return result;
        });

        done = true;
        emitter.emit(['success', 'done'], finalResult);
        resolve(finalResult);
      } catch (e) {
        handleReject(e);
      }
    }),
    {
      isCancelled,
      isDone,
      onCancel,
      onError,
      onSuccess,
      onDone,
      cancel,
    },
  );
}

function createEmitter() {
  let eventListeners = {};
  return {
    on(event, listener) {
      const listeners =
        eventListeners[event] || (eventListeners[event] = new Set());
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(events, params) {
      (Array.isArray(events) ? events : [events]).forEach((event) => {
        const listeners = eventListeners[event];
        if (listeners) {
          for (const listener of listeners) {
            listener(params);
          }
        }
      });
    },
    clear() {
      eventListeners = {};
    },
  };
}

Object.assign(ijob, {
  latest(f) {
    let last;
    return (...args) => {
      if (last) {
        last.catch(noop);
        last.cancel();
      }
      return (last = createJobWithArgs(f, args));
    };
  },
  throttle(ms, f) {
    let lastResult;
    let lastExecution;
    return (...args) => {
      const now = new Date().getTime();
      if (!lastExecution || now - lastExecution >= ms) {
        lastExecution = now;
        lastResult = createJobWithArgs(f, args);
      }
      return lastResult;
    };
  },
  debounce(ms, f) {
    let timerId;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => createJobWithArgs(f, args), ms);
    };
  },
});

function createJobWithArgs(f, args) {
  return ijob((context) => {
    const result = f(...args);
    if (typeof result === 'function') {
      return result(context);
    }
    return result;
  });
}

export class CancelError extends Error {
  constructor(message = 'A job has been cancelled') {
    super(message);
  }
}
