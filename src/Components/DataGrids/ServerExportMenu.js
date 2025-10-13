import React, { useCallback } from 'react';
import { MenuItem } from '@mui/material';
import { GridToolbarExportContainer, useGridApiContext } from '@mui/x-data-grid';

/**
 * Reusable export menu that augments the MUI DataGrid toolbar.
 *
 * @param {object} props
 * @param {Function} [props.onExportAll] handler invoked when "Export All" is selected.
 * @param {boolean} [props.exportingAll] when true, disables the export-all option.
 * @param {object} [props.labels] override default menu labels.
 */
const ServerExportMenu = ({ onExportAll, exportingAll = false, labels }) => {
   const apiRef = useGridApiContext();
   const mergedLabels = {
      exportAll: 'Export All',
      exportFiltered: 'Export Available',
      print: 'Print',
      exporting: 'Exporting...'
   };

   if (labels) {
      Object.assign(mergedLabels, labels);
   }

   const handleExportFiltered = useCallback(() => {
      apiRef.current?.exportDataAsCsv();
   }, [apiRef]);

   const handlePrint = useCallback(() => {
      apiRef.current?.printExport();
   }, [apiRef]);

   return (
      <GridToolbarExportContainer>
         {onExportAll ? (
            <ExportAllMenuItem
               label={mergedLabels.exportAll}
               busyLabel={mergedLabels.exporting}
               exporting={exportingAll}
               onClick={onExportAll}
            />
         ) : null}
         <ExportFilteredMenuItem label={mergedLabels.exportFiltered} onClick={handleExportFiltered} />
         <PrintMenuItem label={mergedLabels.print} onClick={handlePrint} />
      </GridToolbarExportContainer>
   );
};

const ExportAllMenuItem = ({ hideMenu, onClick, exporting, label, busyLabel }) => {
   const handleClick = async () => {
      hideMenu?.();
      await onClick?.();
   };

   return (
      <MenuItem disabled={exporting} onClick={handleClick}>
         {exporting ? busyLabel : label}
      </MenuItem>
   );
};

const ExportFilteredMenuItem = ({ hideMenu, onClick, label }) => (
   <MenuItem
      onClick={() => {
         hideMenu?.();
         onClick?.();
      }}
   >
      {label}
   </MenuItem>
);

const PrintMenuItem = ({ hideMenu, onClick, label }) => (
   <MenuItem
      onClick={() => {
         hideMenu?.();
         onClick?.();
      }}
   >
      {label}
   </MenuItem>
);

export default ServerExportMenu;
