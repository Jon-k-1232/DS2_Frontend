import React from 'react';
import { Alert, Link } from '@mui/material';
const explanations = {
 rates: 'Rates and margins use issued statement cohorts. Work entered and unbilled WIP are separate. Historical costs are estimated; missing costs leave margin unavailable.',
 time: 'Hours use service dates and actual tracker minutes. Work value includes unissued work. Net issued uses statement and correction dates. Raw tracker totals are a separate source view.',
 wip: 'WIP is billable work not yet on an issued statement at the cutoff. Future work and held work are separate. WIP is not revenue.',
 budgets: 'Budget used means billable work entered, including unissued work. It is not an issued or collected amount.',
 capacity: 'Capacity includes actual service hours for active and inactive staff. Records without actual minutes use quantity hours, labeled estimated in Billing performance.'
};
export default function ReportingBasis({ kind }) {
 return <Alert severity='info'>{explanations[kind]} Work follows “worked for”; issued revenue follows “billed by”. <Link href='/reports/billing-performance'>Billing performance and cost provenance</Link></Alert>;
}
