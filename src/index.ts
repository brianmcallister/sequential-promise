import { sequential } from './sequential';

export { sequential, type SequentialTask } from './sequential';
export {
  sequentialAllSettled,
  type Fulfilled,
  type Rejected,
  type Result,
  type SequentialAllSettledTask,
} from './sequentialAllSettled';

export default sequential;
