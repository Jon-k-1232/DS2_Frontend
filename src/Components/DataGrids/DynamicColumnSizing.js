// One shared measuring context — creating a canvas per call added GC pressure
// on grids that recompute widths during typing.
let sharedCtx = null;
const getMeasureContext = () => {
   if (!sharedCtx) {
      sharedCtx = document.createElement('canvas').getContext('2d');
   }
   sharedCtx.font = '14px Roboto';
   return sharedCtx;
};

const getDynamicColumnWidths = (rows, columns) => {
   const ctx = getMeasureContext();

   const basePadding = 20;

   return columns.map(column => {
      // Respect hidden columns: keep their provided width or default to a tiny width
      if (column.hide) {
         return { ...column, width: column.width ?? 1 };
      }
      if (column.field === 'invoiceNote') {
         return { ...column, width: 350 };
      }

      if (column.field === 'showWriteOffs') {
         return { ...column, width: 150 };
      }

      const headerWidth = ctx.measureText(column.headerName).width;
      const maxWidth = rows.reduce((maxWidth, row) => {
         const textWidth = ctx.measureText(row[column.field]).width;
         return Math.max(maxWidth, textWidth);
      }, headerWidth);
      return { ...column, width: maxWidth + 60 + basePadding };
   });
};

export default getDynamicColumnWidths;
