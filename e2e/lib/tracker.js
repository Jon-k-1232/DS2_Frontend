const path = require('path');
const { BACKEND_DIR } = require('./paths');
const xlsx = require(path.join(BACKEND_DIR, 'node_modules/xlsx'));
// Copy the supplied clean fixture, adapting identity and required name columns
// only in memory. The backend fixture and builder are never modified.
function trackerBuffer(prefix) {
  const source = path.join(BACKEND_DIR, 'test/fixtures/timetrackers/clean.xlsx');
  const workbook = xlsx.readFile(source);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet,{header:1});
  data[0][1] = 'Admin Person';
  const columns = Object.fromEntries(data[4].map((name,i) => [name,i]));
  for (const row of data.slice(5)) {
    if (!row.length) continue;
    row[columns['Employee Name']] = 'Admin Person';
    row[columns['Company Name']] = `${prefix} Tracker Customer`;
    row[columns['First Name']] = '';
    row[columns['Last Name']] = '';
    row[columns.Entity] = `${prefix} Tracker Customer`;
    row[columns.Notes] = `${prefix} bookkeeping validation entry`;
  }
  workbook.Sheets[workbook.SheetNames[0]] = xlsx.utils.aoa_to_sheet(data);
  return {buffer:xlsx.write(workbook,{type:'buffer',bookType:'xlsx'}),count:data.slice(5).filter(r => r.length && String(r[columns.Category]).toLowerCase() !== 'lunch').length};
}
module.exports = {trackerBuffer};
