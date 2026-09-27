import React from 'react';
import {render,screen} from '@testing-library/react';
import AuditPrintView from './AuditPrintView';
it('prints noncash transfer amounts separately from prepaid receipts and work draws',()=>{
 render(<AuditPrintView audit={{summary:{totals:{retainer_total_prepaid_lifetime:80,retainer_drawn:0,retainer_available:80,retainer_transferred_in:30,retainer_transferred_out:30},retainers:{total_chains:2,breakdown:[]}}}}/>);
 for(const [label,value] of [['Total prepaid (lifetime)','$80.00'],['Drawn down to date','$0.00'],['Credit transferred in (noncash)','$30.00'],['Credit transferred out (noncash)','$30.00']])expect(screen.getByText(label).parentElement).toHaveTextContent(value);
});
it('separates raw next balance, held receipt funds and proposed credit use',()=>{render(<AuditPrintView audit={{summary:{totals:{audit_balance:500,held_receipt_credit:350,proposed_credit_use:350,proposed_statement_total:150}}}}/>);for(const [label,value] of [['Audit balance (matches app)','$500.00'],['Held receipt credit (separate funds)','$350.00'],['Proposed automatic credit use','$350.00'],['Proposed next statement','$150.00']])expect(screen.getByText(label).parentElement).toHaveTextContent(value);});
