export { sequential as default } from './sequential';
export { sequentialAllSettled, Result } from './sequentialAllSettled';

// const allGoodPromises = [
//   () => new Promise(resolve => setTimeout(() => resolve('timeout'), 200)),
//   () => Promise.resolve('2323'),
// ];

// const promises = [
//   () => { return Promise.resolve('asdf') },
//   () => Promise.reject('oops'),
// ];

// sequential(promises).then((resp) => {
//   console.log('done');
//   console.log(resp);
// }).catch(err => {
//   console.log(err);
// });

// sequential(allGoodPromises).then((resp) => {
//   console.log('done');
//   console.log(resp);
// }).catch(err => {
//   console.log(err);
// });

// sequentialAllSettled(promises).then((resp) => {
//   console.log('done');
//   console.log(resp);
// }).catch(err => {
//   console.log(err);
// })

// sequentialAllSettled(allGoodPromises).then((resp) => {
//   console.log('done');
//   console.log(resp);
// }).catch(err => {
//   console.log(err);
// })
