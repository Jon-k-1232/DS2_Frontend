import { RadioGroup, FormControl, FormControlLabel, Radio } from '@mui/material';

export default function CustomerEntityType({ selectedItems, setSelectedItems }) {
  const { isCommercialCustomer } = selectedItems;

  return (
    <>
      <FormControl>
        <RadioGroup
          style={{ display: 'flex', flexDirection: 'row' }}
          value={isCommercialCustomer}
          onChange={e => setSelectedItems(otherItems => ({ ...otherItems, isCommercialCustomer: e.target.value === 'true' }))}
        >
          <FormControlLabel value={false} control={<Radio size='small' />} label='Individual' />
          <FormControlLabel value={true} control={<Radio size='small' />} label='Business' />
        </RadioGroup>
      </FormControl>
    </>
  );
}
