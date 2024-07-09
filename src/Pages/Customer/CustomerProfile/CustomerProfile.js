import { useState, useEffect, useContext } from 'react';
import { context } from '../../../App';
import { Divider, Stack, Typography, Alert, Box } from '@mui/material';
import { postInvoiceCreation } from '../../../Services/ApiCalls/PostCalls';
import FloatingTooltip from '../../../Components/FloatingTooltip';
import dayjs from 'dayjs';

export default function CustomerProfile({ profileData }) {
   const [customerBalance, setCustomerBalance] = useState({});
   const [postStatus, setPostStatus] = useState(null);

   const {
      loggedInUser: { accountID, userID, token }
   } = useContext(context);

   const customerData = profileData?.customerData?.customerData ?? {};

   const {
      business_name,
      customer_city,
      customer_email,
      customer_id,
      customer_name,
      customer_phone,
      customer_state,
      customer_street,
      customer_zip,
      is_billable,
      is_commercial_customer,
      is_customer_active,
      is_recurring,
      is_this_address_active,
      bill_on_date,
      subscription_frequency,
      start_date,
      end_date,
      recurring_bill_amount
   } = customerData;

   const { outstandingInvoices = {}, transactions = {}, payments = {}, retainers = {}, invoiceTotal, remainingRetainer, retainerAppliedToInvoice } = customerBalance || {};

   useEffect(() => {
      const fetchBalances = async () => {
         const configuration = {
            invoicesToCreate: [{ ...customerData, invoiceNote: '', showWriteOffs: false }],
            invoiceCreationSettings: { globalInvoiceNote: '', isCsvOnly: false, isFinalized: false, isRoughDraft: false }
         };

         const customerTotals = await postInvoiceCreation(configuration, accountID, userID, token);
         if (customerTotals.status !== 200) setPostStatus(customerTotals);
         setCustomerBalance(customerTotals?.invoicesWithDetail[0]);
      };

      if (Object.keys(customerData).length) fetchBalances();
      // eslint-disable-next-line
   }, [customerData]);

   // Tool tip definitions
   const transactionsDefinition = <Typography variant='caption'>All charges, and time transactions are reflected.</Typography>;
   const outstandingInvoice = <Typography variant='caption'>The total amount of all outstanding invoices unpaid to date.</Typography>;
   const startingRetainer = <Typography variant='caption'>This is the amount of the retainer at the start of the cycle.</Typography>;
   const currentRetainer = <Typography variant='caption'>The current total of all retainers. If a transaction in this cycle used a retainer, the amount is reflected.</Typography>;
   const paymentsSinceLastBill = (
      <Box>
         <Typography variant='caption'>The total amount that has been collected via payment, and through retainers used on transactions this cycle.</Typography>
         <table style={styles.tableWrapper}>
            <tbody>
               <tr>
                  <th style={styles.thStyle}>Payments Total:</th>
                  <td style={styles.tdStyle}>{payments?.paymentTotal}</td>
               </tr>
               <tr>
                  <th style={styles.thStyle}>Retainer Payment Total:</th>
                  <td style={styles.tdStyle}>{retainerAppliedToInvoice}</td>
               </tr>
            </tbody>
         </table>
      </Box>
   );
   const totalAmountDueTotal = (
      <table style={styles.tableWrapper}>
         <tbody>
            <tr>
               <th style={styles.thStyle}>Outstanding invoices:</th>
               <td style={styles.tdStyleNumbers}>{outstandingInvoices?.outstandingInvoiceTotal}</td>
            </tr>
            <tr>
               <th style={styles.thStyle}>Transactions this cycle:</th>
               <td style={styles.tdStyleNumbers}>{transactions?.transactionsTotal}</td>
            </tr>
            <tr>
               <th style={styles.thStyle}>Payments this cycle:</th>
               <td style={styles.tdStyleNumbers}>{payments?.paymentTotal}</td>
            </tr>
            <tr>
               <th style={styles.thStyle}>Retainers applied this cycle:</th>
               <td style={styles.tdStyleNumbers}>{retainerAppliedToInvoice}</td>
            </tr>
            <tr>
               <th style={styles.thStyle}>Current Balance:</th>
               <td style={styles.tdStyleNumbers}>{invoiceTotal}</td>
            </tr>
         </tbody>
      </table>
   );

   return (
      <Stack style={styles.component}>
         <Stack style={styles.header} direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
            <Typography variant='h3'>{business_name || customer_name}</Typography>
            <Typography variant='h5'>{is_customer_active ? 'Active' : 'Inactive'}</Typography>
            <Typography variant='h5'>Customer Type: {is_commercial_customer ? 'Commercial' : 'Individual'}</Typography>
            <Typography variant='h5'>Client: {customer_id}</Typography>
         </Stack>

         <Stack style={styles.tableContainer}>
            <table style={styles.tableWrapper}>
               <tbody>
                  <tr>
                     <th style={styles.thStyle}>Company Name:</th>
                     <td style={styles.tdStyle}>{business_name || customer_name}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Name:</th>
                     <td style={styles.tdStyle}>{customer_name}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Billing Address:</th>
                     <td style={styles.tdStyle}>
                        {customer_street} {customer_city}, {customer_state} {customer_zip}
                     </td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Is Billing Address Active:</th>
                     <td style={styles.tdStyle}>{is_this_address_active ? 'Yes' : 'No'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Mailing Address:</th>
                     <td style={styles.tdStyle}>
                        {customer_street} {customer_city}, {customer_state} {customer_zip}
                     </td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Is Mailing Address Active:</th>
                     <td style={styles.tdStyle}>{is_this_address_active ? 'Yes' : 'No'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Cell:</th>
                     <td style={styles.tdStyle}>{customer_phone}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Email:</th>
                     <td style={styles.tdStyle}>{customer_email}</td>
                  </tr>
               </tbody>
            </table>

            <table style={styles.tableWrapper}>
               <tbody>
                  <tr>
                     <th style={styles.thStyle}>Billable:</th>
                     <td style={styles.tdStyle}>{is_billable ? 'Yes' : 'No'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Last Billed:</th>
                     <td style={styles.tdStyle}>{Object.keys(customerBalance).length ? dayjs(outstandingInvoices?.outstandingInvoiceRecords[0]?.invoice_date).format('MMMM DD, YYYY') : 'N/A'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Invoice Due Date:</th>
                     <td style={styles.tdStyle}>{Object.keys(customerBalance).length ? dayjs(outstandingInvoices?.outstandingInvoiceRecords[0]?.due_date).format('MMMM DD, YYYY') : 'N/A'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Last Statement Balance:</th>
                     <td style={styles.tdStyle}>{Object.keys(customerBalance).length ? outstandingInvoices?.outstandingInvoiceRecords[0]?.total_amount_due : 0.0}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Multiple Outstanding Invoices:</th>
                     <td style={styles.tdStyle}>{Object.keys(customerBalance).length && outstandingInvoices?.outstandingInvoiceRecords.length > 1 ? 'Yes' : 'No'}</td>
                  </tr>
                  <FloatingTooltip tooltipContent={outstandingInvoice}>
                     <tr>
                        <th style={styles.thStyle}>Current Outstanding Invoices Total:</th>
                        <td style={styles.tdStyle}>{outstandingInvoices?.outstandingInvoiceTotal}</td>
                     </tr>
                  </FloatingTooltip>
               </tbody>
            </table>
            <table style={styles.tableWrapper}>
               <tbody>
                  <FloatingTooltip tooltipContent={startingRetainer}>
                     <tr>
                        <th style={styles.thStyle}>Starting Retainers/ Pre Payments:</th>
                        <td style={styles.tdStyleNumbers}>{retainers?.retainerTotal}</td>
                     </tr>
                  </FloatingTooltip>

                  <FloatingTooltip tooltipContent={currentRetainer}>
                     <tr>
                        <th style={styles.thStyle}>Current Retainer/ Pre Payment:</th>
                        <td style={styles.tdStyleNumbers}>{remainingRetainer}</td>
                     </tr>
                  </FloatingTooltip>

                  <FloatingTooltip tooltipContent={paymentsSinceLastBill}>
                     <tr>
                        <th style={styles.thStyle}>Payments Since Last Bill:</th>
                        <td style={styles.tdStyleNumbers}>{payments?.paymentTotal + retainerAppliedToInvoice}</td>
                     </tr>
                  </FloatingTooltip>

                  <FloatingTooltip tooltipContent={transactionsDefinition}>
                     <tr>
                        <th style={styles.thStyle}>Total Charges This Cycle:</th>
                        <td style={styles.tdStyleNumbers}>{transactions?.transactionsTotal}</td>
                     </tr>
                  </FloatingTooltip>

                  <FloatingTooltip tooltipContent={totalAmountDueTotal}>
                     <tr>
                        <th style={styles.thStyle}>Current Balance:</th>
                        <td style={styles.tdStyleNumbers}>{invoiceTotal}</td>
                     </tr>
                  </FloatingTooltip>
               </tbody>
            </table>
            <table style={styles.tableWrapper}>
               <tbody>
                  <tr>
                     <th style={styles.thStyle}>Recurring Customer:</th>
                     <td style={styles.tdStyle}>{is_recurring ? 'Yes' : 'No'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Frequency:</th>
                     <td style={styles.tdStyle}>{is_recurring ? `${subscription_frequency}` : 'N/A'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Billing Day:</th>
                     <td style={styles.tdStyle}>{is_recurring ? `${bill_on_date}` : 'N/A'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Recurring Bill Amount:</th>
                     <td style={styles.tdStyle}>{is_recurring ? `${recurring_bill_amount}` : 'N/A'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Recurring Start Date:</th>
                     <td style={styles.tdStyle}>{start_date ? dayjs(start_date).format('MMMM DD, YYYY') : 'N/A'}</td>
                  </tr>
                  <tr>
                     <th style={styles.thStyle}>Recurring End Date:</th>
                     <td style={styles.tdStyle}>{end_date ? dayjs(end_date).format('MMMM DD, YYYY') : 'N/A'}</td>
                  </tr>
               </tbody>
            </table>
         </Stack>
         {postStatus && <Alert severity={postStatus.status === 200 ? 'success' : 'error'}>{postStatus.message}</Alert>}
         <Divider style={styles.divider} />
      </Stack>
   );
}

const styles = {
   component: {
      paddingBottom: '20px'
   },
   header: {
      padding: '6px 0px'
   },
   tableContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'spaceAround',
      alignSelf: 'flexStart'
   },
   thStyle: {
      textAlign: 'left'
   },
   tdStyle: {
      textAlign: 'left',
      paddingLeft: '5px'
   },
   tdStyleNumbers: {
      textAlign: 'right',
      paddingLeft: '5px'
   },
   tableWrapper: {
      fontSize: '0.875rem',
      height: 'min-Content',
      paddingRight: '10px'
   },
   divider: {
      marginTop: '20px'
   }
};
