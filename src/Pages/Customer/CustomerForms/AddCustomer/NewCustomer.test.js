jest.mock('axios', () => ({}));
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewCustomer from './NewCustomer';
import { context } from '../../../../App';
import { postNewCustomer } from '../../../../Services/ApiCalls/PostCalls';

jest.mock('../../../../App', () => ({ context: require('react').createContext({}) }));
jest.mock('../../../../Services/ApiCalls/PostCalls', () => ({ postNewCustomer: jest.fn() }));

const success = { status: 200, message: 'Customer saved.', customersList: { rows: [] }, recurringCustomersList: {} };
function setup() {
   const update = jest.fn();
   render(<context.Provider value={{ loggedInUser: { accountID: 9001, userID: 90013 } }}>
      <NewCustomer customerData={{}} setCustomerData={update} />
   </context.Provider>);
   fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Mary Ann' } });
   fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Van Buren' } });
   return update;
}
beforeEach(() => jest.clearAllMocks());

test('a pending save disables submission and rapid clicks send one customer', async () => {
   let finish;
   postNewCustomer.mockReturnValue(new Promise(resolve => { finish = resolve; }));
   const update = setup();
   const button = screen.getByRole('button', { name: 'Submit', exact: true });
   fireEvent.click(button); fireEvent.click(button);
   expect(postNewCustomer).toHaveBeenCalledTimes(1);
   expect(button).toBeDisabled();
   await act(async () => finish(success));
   expect(update).toHaveBeenCalledTimes(1);
   expect(screen.getByLabelText('First Name')).toHaveValue('');
   expect(screen.getByRole('alert')).toHaveTextContent('Customer saved.');
});

test('lost confirmation is visible, retains the draft and permits an explicit retry', async () => {
   postNewCustomer.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(success);
   const update = setup();
   fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
   expect(await screen.findByRole('alert')).toHaveTextContent(/Network Error.*check the client list/i);
   expect(screen.getByLabelText('First Name')).toHaveValue('Mary Ann');
   expect(screen.getByLabelText('Last Name')).toHaveValue('Van Buren');
   expect(update).not.toHaveBeenCalled();
   fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
   await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
   expect(postNewCustomer).toHaveBeenCalledTimes(2);
});

test('a transport error with a server refusal retains the draft and displays the server message', async () => {
   postNewCustomer.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Not authorized to create this client.' } } });
   const update = setup();
   fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
   expect(await screen.findByRole('alert')).toHaveTextContent('Not authorized to create this client.');
   expect(screen.getByRole('alert')).not.toHaveTextContent('Check the client list');
   expect(screen.getByLabelText('First Name')).toHaveValue('Mary Ann');
   expect(screen.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
   expect(update).not.toHaveBeenCalled();
});

test('a body-status refusal retains the draft and allows correction', async () => {
   postNewCustomer.mockResolvedValueOnce({ status: 400, message: 'A client name is required.' });
   const update = setup();
   fireEvent.click(screen.getByRole('button', { name: 'Submit', exact: true }));
   expect(await screen.findByRole('alert')).toHaveTextContent('A client name is required.');
   expect(screen.getByLabelText('First Name')).toHaveValue('Mary Ann');
   expect(screen.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
   expect(update).not.toHaveBeenCalled();
});
