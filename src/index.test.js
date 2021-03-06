import job, {CancelError} from 'ijob';
import state from 'istate';

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(resolve, ms, value));

test('should receive error properly', () => {
  const p = job(() => {
    throw new Error('error');
  });

  expect(p).rejects.toThrow('error');
});

test('should cancel job from outside function call properly', async () => {
  const cancelListener1 = jest.fn();
  const cancelListener2 = jest.fn();
  const count = jest.fn();
  const p = job(async ({onCancel, isCancelled}) => {
    onCancel(cancelListener1);
    count();
    await delay(20);
    !isCancelled() && count();
  });
  p.onCancel(cancelListener2);
  await delay(10);
  p.cancel();
  expect(count).toBeCalledTimes(1);
  expect(cancelListener1).toBeCalledTimes(1);
  expect(cancelListener2).toBeCalledTimes(1);
  await expect(p).rejects.toThrow(CancelError);
});

test('should cancel nested calls properly', async () => {
  const cancelListener1 = jest.fn();
  const cancelListener2 = jest.fn();
  const count = jest.fn();
  const parentJob = () =>
    job(async ({onCancel}) => {
      onCancel(cancelListener1);
      count();
      await childJob();
    });
  const childJob = () =>
    job(async ({onCancel, isCancelled}) => {
      onCancel(cancelListener2);
      count();
      await delay(20);
      !isCancelled() && count();
    });
  const p = parentJob();
  await delay(10);
  p.cancel();
  expect(count).toBeCalledTimes(2);
  expect(cancelListener1).toBeCalledTimes(1);
  expect(cancelListener2).toBeCalledTimes(1);
  await expect(p).rejects.toThrow(CancelError);
});

test('should support generator', async () => {
  const count = jest.fn();
  const result = await job(function* () {
    for (let i = 0; i < 5; i++) {
      count();
    }
    return 1;
  });
  expect(result).toBe(1);
  expect(count).toBeCalledTimes(5);
});

test('should support async generator', async () => {
  const count = jest.fn();
  const p = job(async function* () {
    for (let i = 0; i < 5; i++) {
      const r = yield [delay, 10, 1];
      yield [count];
    }
    return 1;
  });
  await delay(30);
  p.cancel();
  expect(count).toBeCalledTimes(2);
  await expect(p).rejects.toThrow(CancelError);
});

test('should run latest job', async () => {
  const count = jest.fn();
  const states = [];
  const f = job.latest(function* () {
    for (let i = 0; i < 5; i++) {
      yield [delay, 10, 1];
      yield [count];
    }
    return 100;
  });
  f.subscribe((state) => states.push(state));
  f();
  f();
  await f();
  expect(count).toBeCalledTimes(5);
  expect(states).toEqual([
    {state: 'loading'},
    {state: 'cancelled'},
    {state: 'loading'},
    {state: 'cancelled'},
    {state: 'loading'},
    {state: 'hasValue', value: 100},
  ]);
});

test('job.func', async () => {
  const CountState = state(100);
  const Increase = () => {
    const [count, setCount] = CountState();
    setCount(count + 1);
  };
  const IncreaseAsync = job.func(async () => {
    console.log(11);
    await delay(200);
    console.log(22);
    Increase();
  });
  const timerId = setInterval(IncreaseAsync, 500);
  await delay(2000);
  clearInterval(timerId);
});
