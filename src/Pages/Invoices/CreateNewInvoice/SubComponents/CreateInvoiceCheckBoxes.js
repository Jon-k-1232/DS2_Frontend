import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

export default function CreateInvoiceCheckBoxes({ invoiceCreationSettings, setInvoiceCreationSettings }) {
  const { isRoughDraft, isFinalized, isCsvOnly } = invoiceCreationSettings;

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
