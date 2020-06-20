# ijob

Helper for creating cancellable promise-returning functions.

## Create simple job

```jsx harmony
import job from 'ijob';

async function doSomething() {}
async function cleanup() {}
function processResult() {}

const myJob = job(async ({onCancel, isCancelled}) => {
  onCancel(cleanup);
  const result = await doSomething();
  if (!isCancelled()) {
    processResult(result);
  }
});

myJob.onCancel(() => console.log('job cancelled'));
myJob.onSuccess(() => console.log('job succeeded'));
myJob.onError(() => console.log('job failed'));
myJob.onDone(() => console.log('job done'));
// job.cancel();
```

## Support (Async) Generator

```jsx harmony
import job from 'ijob';
let count = 0;
const Increase = () => count++;
const Delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

job(function* () {
  for (let i = 0; i < 1000; i++) {
    yield [Delay, 100]; // delay in 100ms
    yield [Increase];
  }
});
```

## Perform the latest job

```jsx harmony
import job from 'ijob';
const callServerApi = () => {};
const renderProductList = () => {};
const SearchProducts = job.latest(({isCancelled}) => async (term) => {
  const products = await callServerApi(term);
  if (!isCancelled()) {
    renderProductList(products);
  }
});
```
