import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import navigation from '../Routes/navigation.json';
import { fetchMenuOptions } from '../Routes/GroupedRoutes/CustomerRoutes/CustomerProfileSubRoutes';
import WorkspaceHeader from '../Components/Workspace/WorkspaceHeader';
import { context } from '../App';
import { pageHelp, helpForPath, renderHelpMarkdown } from './pageHelp';
import typography from '../Theme/typography';

jest.mock('../App', () => ({ context: require('react').createContext({}) }));
const leaves = navigation.flatMap(group => group.children);
test.each(leaves)('help explains $path in five business bullets', ({ path }) => {
  expect(pageHelp[path]).toBeDefined();
  expect(pageHelp[path].bullets).toHaveLength(5);
  expect(pageHelp[path].bullets.every(bullet => bullet.length > 20)).toBe(true);
  expect(helpForPath(path)).toBe(pageHelp[path]);
});
test('all client tabs have their own matching help, including Overview and Edit client', () => {
  for (const tab of fetchMenuOptions(jest.fn(), true, '/clients/123', true)) {
    const route = tab.route.replace('/123', '/:customerId');
    expect(pageHelp[route]).toBeDefined();
    expect(helpForPath(tab.route)).toBe(pageHelp[route]);
  }
});
test('help has no stale sidebar keys and the Obsidian document is the generated content', () => {
  const destinations = [...leaves.map(p => p.path), ...fetchMenuOptions(jest.fn(), true, '/clients/123', true).map(tab=>tab.route.replace('/123','/:customerId')), '/billing/invoices/:invoiceId', '/payments/receipts/:receiptId', '/settings/entities/cutover', '/dashboard/app'];
  for (const route of Object.keys(pageHelp)) {
    expect(destinations).toContain(route);
  }
  expect(renderHelpMarkdown()).toContain('# About DS2 pages');
  expect(require('fs').readFileSync(require('path').resolve(__dirname, '../../../DS2_Backend/docs/platform/page-help.md'), 'utf8')).toBe(renderHelpMarkdown());
});
test('longest route wins and unknown routes cannot display misleading help', () => {
  expect(helpForPath('/work/review/entities')).toBe(pageHelp['/work/review/entities']);
  expect(helpForPath('/clients/123/auditRecord')).toBe(pageHelp['/clients/:customerId/auditRecord']);
  expect(helpForPath('/billing/invoices/456/work')).toBe(pageHelp['/billing/invoices/:invoiceId']);
  expect(helpForPath('/not-a-page')).toBeNull();
});
test('shared information button is keyboard reachable, opens, closes with Escape and restores focus', async () => {
  render(<MemoryRouter initialEntries={['/billing/credit-memos']}><context.Provider value={{ loggedInUser: { accessLevel: 'admin' } }}><main id="main-content" tabIndex={-1}><WorkspaceHeader /></main></context.Provider></MemoryRouter>);
  const button = screen.getByRole('button', { name: 'About this page' });
  for (let i = 0; i < 12 && document.activeElement !== button; i += 1) userEvent.tab();
  expect(button).toHaveFocus();
  userEvent.keyboard('{Enter}');
  expect(await screen.findByRole('dialog', { name: 'About Credit memos' })).toBeVisible();
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getByRole('dialog')).toHaveTextContent('lower billed revenue');
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(button).toHaveFocus();
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('button', { name: 'Close page help' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
test('buttons retain the sentence case written by the page', () => {
  expect(typography.button.textTransform).toBe('none');
});
