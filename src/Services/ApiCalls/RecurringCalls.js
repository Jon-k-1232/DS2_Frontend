import axios from 'axios';
import config from '../../config';
export async function recurringCall(path, method = 'get', body, key) {
  const { data } = await axios({ url: `${config.API_ENDPOINT}/recurringCustomer${path}`, method, data: body,
    ...(key ? { headers: { 'Idempotency-Key': key } } : {}) });
  if (data.status >= 400) throw new Error(data.message);
  return data;
}
export { recurringError, retryKey } from './RecurringValues';
