import { render, screen, act } from '@testing-library/react';
import { context } from '../../../App';
import TransactionsGrid from './TransactionsGrid';
import PaymentsGrid from './PaymentsGrid';
import WriteOffsGrid from './WriteOffsGrid';
import { fetchTransactions, fetchPayments, fetchWriteOffs } from '../../../Services/ApiCalls/FetchCalls';
jest.mock('../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../TransactionForms/AddTransaction/Payment', () => () => null);
jest.mock('../TransactionForms/AddTransaction/WriteOff', () => () => null);
jest.mock('../TransactionForms/AddTransaction/Time', () => () => null);
jest.mock('../TransactionForms/AddTransaction/Charge', () => () => null);
jest.mock('../../../Components/DataGrids/PaginationGrid', () => props => <div>{props.renderToolbarContent()}</div>);
jest.mock('../../../Services/ApiCalls/FetchCalls', () => ({ fetchTransactions: jest.fn(), fetchPayments: jest.fn(), fetchWriteOffs: jest.fn() }));

test.each([
  ['Transactions', TransactionsGrid, fetchTransactions, 'transactionsList', 'activeTransactionsData'],
  ['Payments', PaymentsGrid, fetchPayments, 'paymentsList', 'activePaymentsData'],
  ['Write-offs', WriteOffsGrid, fetchWriteOffs, 'writeOffsList', 'activeWriteOffsData']
])('%s refresh preserves focus in an in-progress form', async (_, Grid, fetch, list, active) => {
  const pending = [];
  fetch.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const data = { [list]: { [active]: { grid: { rows: [], columns: [] }, pagination: {page: 1, limit: 20, totalItems: 0} } } };
  const view = value => <context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013, token: 'local' } }}><Grid customerData={value} setCustomerData={jest.fn()} /><input aria-label='In-progress form' /></context.Provider>;
  const { rerender } = render(view(data));
  const field = screen.getByLabelText('In-progress form');
  field.focus();
  rerender(view({ ...data, [list]: { ...data[list] } }));
  await act(async () => pending.forEach(resolve => resolve(data)));
  expect(field).toHaveFocus();
});
