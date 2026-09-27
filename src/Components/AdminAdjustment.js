import React,{useContext} from 'react';
import {Alert} from '@mui/material';
import {context} from '../App';
export const isAdjustmentAdmin=role=>['admin','super admin'].includes(String(role || '').toLowerCase());
export default function AdminAdjustment({children}){const {loggedInUser}=useContext(context);return isAdjustmentAdmin(loggedInUser.accessLevel)?children:<Alert severity='info'>Only admins may apply, edit or remove write-offs and adjustments.</Alert>;}
