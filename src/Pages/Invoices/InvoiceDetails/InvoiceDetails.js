import { useContext } from 'react';
import { Stack, Divider, Button, Box, Alert } from '@mui/material';
import { fetchFileDownload } from '../../../Services/ApiCalls/FetchCalls';
import dayjs from 'dayjs';
import { context } from '../../../App';

export default function InvoiceDetails({ invoiceData, postStatus, setPostStatus }) {
   const {
      loggedInUser: { accountID, userID }
   } = useContext(context);

   const { invoiceDetails = {} } = invoiceData ?? {};

   const {
      beginning_balance,
      customer_city,
      customer_email,
      customer_id,
      customer_info_id,
      customer_invoice_id,
      customer_name,
      customer_phone,
      customer_state,
      customer_street,
      customer_zip,
      due_date,
      end_date,
      fully_paid_date,
      invoice_date,
      invoice_file_location,
      invoice_number,
      remaining_balance_on_invoice,
      start_date,
      total_amount_due,
      total_charges,
      total_payments,
      total_retainers,
      total_write_offs
   } = invoiceDetails;

   const handleSubmit = async () => {
      // Re download the invoice file
      const downloadedPdfFile = await fetchFileDownload(invoice_file_location, 'zipped_invoice.zip', accountID, userID);
      setPostStatus(downloadedPdfFile);
   };

   return (
      <>
         <Stack style={styles.tableContainer}>
            <table style={styles.tableWrapper}>
               <tbody>
                  <tr>
                     <th style={styles.thStyle}>Company Name:</th>
                     <td style={styles.tdStyle}>{customer_name}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Billing Address:</th>
                     <td style={styles.tdStyle}>
                        {customer_street}
                        <br />
                        {customer_city} {customer_state}, {customer_zip}
                     </td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Customer Phone:</th>
                     <td style={styles.tdStyle}>{customer_phone}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Email:</th>
                     <td style={styles.tdStyle}>{customer_email}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Customer ID Row ID:</th>
                     <td style={styles.tdStyle}>{customer_id}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Customer Address Row ID:</th>
                     <td style={styles.tdStyle}>{customer_info_id}</td>
                  </tr>
               </tbody>
            </table>

            <table style={styles.tableWrapper}>
               <tbody>
                  <tr>
                     <th style={styles.thStyle}>Invoice ID:</th>
                     <td style={styles.tdStyle}>{invoice_number}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Invoice Date:</th>
                     <td style={styles.tdStyle}>{dayjs(invoice_date).format('MMMM DD, YYYY')}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Invoice Due Date:</th>
                     <td style={styles.tdStyle}>{dayjs(due_date).format('MMMM DD, YYYY')}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Data Start Date:</th>
                     <td style={styles.tdStyle}>{dayjs(start_date).format('MMMM DD, YYYY')}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Data End Date:</th>
                     <td style={styles.tdStyle}>{dayjs(end_date).format('MMMM DD, YYYY')}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Fully Paid Date:</th>
                     <td style={styles.tdStyle}>{fully_paid_date ? dayjs(fully_paid_date).format('MMMM DD, YYYY') : 'Outstanding'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Invoice Row ID:</th>
                     <td style={styles.tdStyle}>{customer_invoice_id}</td>
                  </tr>
               </tbody>
            </table>

            <table style={styles.tableWrapper}>
               <tbody>
                  <tr>
                     <th style={styles.thStyle}>Beginning Balance:</th>
                     <td style={styles.tdStyle}>{beginning_balance}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Total Payments:</th>
                     <td style={styles.tdStyle}>{total_payments}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Total Retainers:</th>
                     <td style={styles.tdStyle}>{total_retainers}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Total Charges:</th>
                     <td style={styles.tdStyle}>{total_charges}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Total Write Offs:</th>
                     <td style={styles.tdStyle}>{total_write_offs}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Total Amount Due:</th>
                     <td style={styles.tdStyle}>{total_amount_due}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Amount Remaining:</th>
                     <td style={styles.tdStyle}>{remaining_balance_on_invoice}</td>
                  </tr>
               </tbody>
            </table>
            <Box>
               <Button onClick={handleSubmit}>Download Invoice</Button>
            </Box>
         </Stack>
         {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
         <Divider style={styles.divider} />
      </>
   );
}

const styles = {
   component: {
      paddingBottom: '20px'
   },
   tableContainer: {
      padding: '6px 0px',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignSelf: 'flexStart'
   },
   thStyle: {
      textAlign: 'left',
      width: '180px'
   },
   tdStyle: {
      textAlign: 'left',
      width: '320',
      paddingRight: '20px'
   },
   tableWrapper: {
      fontSize: '0.875rem',
      height: 'min-Content'
   },
   divider: {
      marginTop: '20px'
   }
};
