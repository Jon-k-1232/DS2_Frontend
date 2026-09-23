import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

export default function CreateInvoiceCheckBoxes({ invoiceCreationSettings, setInvoiceCreationSettings, hasBilledTodaySelected }) {
  const { isRoughDraft, isFinalized, isCsvOnly, allowSameDayRebill } = invoiceCreationSettings;

  const handleCheckboxChange = event => {
    const { name, checked } = event.target;
    setInvoiceCreationSettings(name, checked);
  };

  return (
    <>
      <FormGroup row>
        <FormControlLabel
          control={
            <Checkbox disabled={isRoughDraft || isCsvOnly} checked={isFinalized} onChange={handleCheckboxChange} name='isFinalized' />
          }
          label='Lock And Finalize Selected Invoices'
        />
        <FormControlLabel
          control={
            <Checkbox
              disabled={!hasBilledTodaySelected}
              checked={Boolean(allowSameDayRebill)}
              onChange={handleCheckboxChange}
              name='allowSameDayRebill'
            />
          }
          label="Allow same-day re-bill (replaces today's statement)"
        />
        <FormControlLabel
          control={<Checkbox disabled={isFinalized} checked={isRoughDraft} onChange={handleCheckboxChange} name='isRoughDraft' />}
          label='Create Rough Draft PDFs'
        />
        <FormControlLabel
          control={<Checkbox disabled={isFinalized} checked={isCsvOnly} onChange={handleCheckboxChange} name='isCsvOnly' />}
          label='Create CSV Only'
        />
      </FormGroup>
    </>
  );
}
