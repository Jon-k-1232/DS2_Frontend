import dayjs from 'dayjs';

/**
 * The backend Api generally gives all the column data nd row data. this will allow a user to specify what columns they want.
 * @param {*} data- the table data object
 * @param {*} columns - when passing column names, id is required - ['id', 'name', 'age'] these should be columns that are to be showen.
 * @returns  {object} - returns an object with the columns and rows filtered based on user input
 */
export const filterGridByColumnName = (data, columns) => {
   // Filter and sort columns based on the order in the 'columns' array
   const filteredColumns = columns
      .map(colName => {
         return data.columns.find(col => col.field === colName);
      })
      .filter(Boolean); // Remove undefined items

   // Recursive function to filter and transform rows
   const filterRows = rows => {
      return rows.map(row => {
         const filteredRow = filteredColumns.reduce(
            (acc, col) => {
               // Check if the value is a date string
               if (dayjs(row[col.field], 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid()) {
                  // If it is, format it to "MM DD YYYY h:mm A"
                  acc[col.field] = dayjs(row[col.field]).format('MMMM D, YYYY hh:mm A');
               } else {
                  acc[col.field] = row[col.field];
               }
               return acc;
            },
            { id: row.id }
         ); // Initialize with the 'id' field

         // If the row has children, recursively filter them
         if (row.children && row.children.length > 0) {
            filteredRow.children = filterRows(row.children);
         }

         return filteredRow;
      });
   };

   const filteredRows = filterRows(data.rows);

   return {
      columns: filteredColumns,
      rows: filteredRows
   };
};

/**
 * formats the total
 * @param {*} value
 * @returns
 */
export const formatTotal = value => {
   return value
      .toFixed(2)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
