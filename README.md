# sequential-promise

[![codecov](https://codecov.io/gh/brianmcallister/sequential-promise/branch/master/graph/badge.svg)](https://codecov.io/gh/brianmcallister/sequential-promise) [![CircleCI](https://circleci.com/gh/brianmcallister/sequential-promise.svg?style=svg)](https://circleci.com/gh/brianmcallister/sequential-promise) [![npm version](https://img.shields.io/npm/v/@brianmcallister/sequential-promise?label=version&color=%2354C536&logo=npm)](https://www.npmjs.com/package/@brianmcallister/sequential-promise)

> Run Promises that depend on each other sequentially

`sequential-promise` allows for running a series of promises sequentially, where each promise in the list depends on the previous promise having [settled](https://github.com/domenic/promises-unwrapping/blob/master/docs/states-and-fates.md). There are two functions in this package, one that mirrors the behavior of [`Promise#all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all), and one mirroring [`Promise#allSettled`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) (but which does not require `Promise#allSettled` to exist in your environment).

## Table of contents

<!-- - [Demo](#demo) -->
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - Functions
    - [`sequential`](#sequential)
    - [`sequentialAllSettled`](#sequentialallsettled)
  - Types
    - [`Result<T>`](#resultt)

<!--
## Demo

Hosted demo: [https://sequential-promise.netlify.com/](https://sequential-promise.netlify.com/)

You can also run the demo locally. To get started:

```sh
git clone git@github.com:brianmcallister/sequential-promise.git
cd sequential-promise/demo
npm i
npm start
```

###### [⇡ Top](#table-of-contents)
-->

## Installation

```sh
npm install sequential-promise
```

###### [⇡ Top](#table-of-contents)

## Usage

The main concept to understand here is that you'll need to create an array of functions that create Promises, not an array of Promises (if you're using TypeScript, then the compiler will yell at you if you pass `Promise<unknown>[]`).

The functions in this package iterate over the array of functions you pass, calls each one, and then waits for each returned promise settle before continuing on.

```ts
import sequential from 'sequential-promise';

const asyncRequests = [
  () => fetchUser({ id: 1 }),
  (user1) => fetchOrderDetails(user1.orders),
];

sequential(asyncRequests).then(([user1, userOrderDetails]) => {
  renderOrderDetails(userOrderDetails);
});

// ...or with async/await:
const [user1, userOrderDetails] = await sequential(asyncRequests);

renderOrderDetails(userOrderDetails);
```

###### [⇡ Top](#table-of-contents)

## API

### Functions

#### `sequential`

```ts
import sequential from 'sequential-promise';
```

`sequential` is the default export. It iterates over an array of functions that return promises. If one of the promises rejects, then everything will stop, and `sequential` will return a rejected promise, just like how [`Promise#all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) behaves.

```ts
sequential: <T>(funcs: ((list: T[]) => Promise<T>)[]) => Promise<T[]>;
```

All promises resolving:

```ts
import sequential from 'sequential-promise';

const promises = [
  () => Promise.resolve('one'),
  () => Promise.resolve('two'),
];

const results = await sequential(promises);
// #=> ['one', 'two'];
```

Some promises rejecting:

```ts
import sequential from 'sequential-promise';

const promises = [
  () => Promise.resolve('one'),
  () => Promise.reject('oops'),
];

try {
  await sequential(promises)
} catch (err) {
  console.log(err);
  // #=> 'oops';
}
```

#### `sequentialAllSettled`

```ts
import { sequentialAllSettled } from 'sequential-promise';
```

`sequentialAllSettled` attempts to behave the same way the forthcoming [`Promise#allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) behaves.

Even if one of the promises rejects, the iteration won't stop. Instead, the results of every promise are gathered up and the final promise resolves with a summary of all the promises settled values as `Result<T>[]` (See: [`Result<T>`](#resultt) below.

```ts
sequentialAllSettled: <T>(funcs: ((list: Result<T>[]) => Promise<T>)[]) => Promise<Result<T>[]>;
```

Example:

```ts
import { sequentialAllSettled } from 'sequential-promise';

const promises = [
  () => Promise.resolve('one'),
  () => Promise.reject('oops'),
];

const results = await sequentialAllSettled(promises);
// #=> [{ status: 'fulfilled', value: 'one' }, { status: 'rejected', reason: 'oops' }];
```

###### [⇡ Top](#table-of-contents)

### Types

#### `Result<T>`

Settled value when using [`sequentialAllSettled`](#sequentialallsettled).

```ts
import { Result } from 'sequential-promise';
```

```ts
interface Fulfilled<T> {
    status: 'fulfilled';
    value: T;
}

interface Rejected {
    status: 'rejected';
    reason: unknown;
}

type Result<T> = Fulfilled<T> | Rejected;
```

###### [⇡ Top](#table-of-contents)
