import { withSentLockColumn } from './sentLockColumn';
it('leaves unlocked grids alone',()=> { const cols=[{field:'name'}]; expect(withSentLockColumn(cols,[])).toBe(cols); });
it('keeps a visible status after feature column filtering',()=> {
 const row={sent_locked:true,locked_invoice_number:'INV-1'};
 const cols=withSentLockColumn([{field:'name'}],[row]);
 expect(cols[0].headerName).toBe('Statement status'); expect(cols[0].valueGetter({row})).toBe('Sent — locked · INV-1');
 expect(cols[0].valueGetter({row:{}})).toBe('');
});
it('adds a visible duplicate badge linking to its review after grid filtering',()=>{
 const row={possible_duplicate:true,duplicate_ids:[8]};const cols=withSentLockColumn([{field:'name'}],[row]);
 expect(cols[0].headerName).toBe('Duplicate review');const chip=cols[0].renderCell({row});expect(chip.props.label).toBe('Possible duplicate');expect(chip.props.href).toBe('/transactions/possibleDuplicates?duplicateId=8');expect(cols[0].renderCell({row:{}})).toBe(null);
});
