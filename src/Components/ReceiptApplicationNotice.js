import React from 'react';
import {Alert,Button} from '@mui/material';
import {Link} from 'react-router-dom';
export default function ReceiptApplicationNotice({receiptId}){
 return <Alert severity='info'>This payment is part of receipt #{receiptId}. Open the receipt to correct one unissued application or reverse the complete bounced check. <Button component={Link} to={`/payments/receipts/${receiptId}`}>Open receipt</Button></Alert>;
}
