import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { context } from '../../App';
import CorrectionRegister from './CorrectionRegister';
import { correctionCall } from '../../Services/ApiCalls/CorrectionCalls';
jest.mock('../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../Components/BillingEntities/EntityPicker', () => () => <div />);
jest.mock('../../Services/ApiCalls/CorrectionCalls', () => ({ correctionCall: jest.fn(), correctionError: e => e.message }));
const record = { memo_id: 1, number: 'CM-2026-43', actor_id: 90013, actor_name: 'Admin Person', amount: '10.00', reason: 'Correct an overcharge', display_name: 'Client One', billing_entity_name: 'Tax', effective_date: '2026-09-26' };
function mount() { render(<MemoryRouter><context.Provider value={{ loggedInUser: { accessLevel: 'admin' } }}><CorrectionRegister /></context.Provider></MemoryRouter>); }
beforeEach(() => jest.clearAllMocks());
test('memo register shows named actors, issued/reversed status and unbroken document numbers', async () => {
  correctionCall.mockResolvedValue({ records: [record, { ...record, memo_id: 2, number: 'CM-2026-44', reversal_id: 8 }], totalCount: 2 });
  mount();
  expect(await screen.findByRole('columnheader', { name: 'Status' })).toBeVisible();
  expect(await screen.findAllByText('Admin Person')).toHaveLength(2);
  expect(screen.queryByText(/User #90013/)).not.toBeInTheDocument();
  expect(screen.getByText('Issued', { exact: true })).toBeVisible();
  expect(screen.getByText('Reversed', { exact: true })).toBeVisible();
  expect(screen.getByRole('cell', { name: 'CM-2026-43', exact: true })).toHaveStyle({ whiteSpace: 'nowrap' });
  expect(screen.getAllByText('2026-09-26')[0]).toHaveStyle({whiteSpace:'nowrap'});
});
test('empty register explains where to start and a failed load offers a working retry', async () => {
  correctionCall.mockRejectedValueOnce(new Error('Records unavailable')).mockResolvedValue({ records: [], totalCount: 0 });
  mount();
  expect(await screen.findByText('Records unavailable')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No credit memos match this business. Open a finalized invoice to issue one.')).toBeVisible();
  await waitFor(() => expect(screen.queryByText('Records unavailable')).not.toBeInTheDocument());
});
test('a pending reversal review prevents switching to another memo before balances are ready',async()=>{
 let finish;correctionCall.mockResolvedValueOnce({records:[record,{...record,memo_id:2,number:'CM-2026-44'}],totalCount:2});mount();
 await screen.findByText('CM-2026-43',{selector:'td'});
 correctionCall.mockImplementation(path=>path==='/credit-memos/1'?new Promise(resolve=>{finish=resolve;}):Promise.resolve({ledgerFingerprint:'v'}));
 fireEvent.click(screen.getByRole('button',{name:'Reverse memo CM-2026-43'}));
 expect(screen.getByRole('button',{name:'Reverse memo CM-2026-44'})).toBeDisabled();
 await require('@testing-library/react').act(async()=>finish({reversals:[]}));
 expect(await screen.findByLabelText('Memo reversal reason')).toBeVisible();
});
