import { useRef, useState } from 'react';

// A ref closes the interval before React renders the disabled button. Failed
// requests preserve form values and release the guard for an explicit retry.
export default function useFinancialSubmit(setPostStatus) {
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (operation, validationError) => {
    if (pending.current) return;
    if (validationError) { setPostStatus({ status: 400, message: validationError }); return; }
    pending.current = true;
    setSubmitting(true);
    try { await operation(); }
    catch (error) { setPostStatus({ status: error.response?.status || 500, message: error.response?.data?.message || error.message || 'Unable to save. Please retry.' }); }
    finally { pending.current = false; setSubmitting(false); }
  };
  return { submitting, submit };
}

export function validateFinancialForm(items, kind) {
  if (!items.selectedCustomer) return 'Select a customer.';
  if (!items.selectedDate?.isValid?.()) return 'Select a valid transaction date.';
  const number = v => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v));
  if (kind === 'Time' || kind === 'Charge') {
    if (!items.selectedJob) return 'Select a job.';
    if (!items.selectedTeamMember) return 'Select a team member.';
    if (!items.selectedGeneralWorkDescription) return 'Select a general work description.';
    if (kind === 'Time' && (!number(items.minutes) || Number(items.minutes) <= 0)) return 'Enter a positive time duration.';
    if (!number(items.quantity) || Number(items.quantity) < 0) return 'Enter a valid, nonnegative quantity.';
    if (!number(items.unitCost) || Number(items.unitCost) < 0) return 'Enter a valid, nonnegative unit cost.';
  } else {
    if (!number(items.unitCost) || Math.round(Math.abs(Number(items.unitCost)) * 100) < 1) return 'Enter an amount greater than $0.00.';
    if (Math.abs(Number(items.unitCost)) > 99999999.99) return 'The amount exceeds the supported maximum of $99999999.99.';
  }
  return null;
}
