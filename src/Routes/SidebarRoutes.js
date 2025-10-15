import { Icon } from '@iconify/react';
// import pieChart2Fill from '@iconify/icons-eva/pie-chart-2-fill';
import peopleFill from '@iconify/icons-eva/people-fill';
import fileTextFill from '@iconify/icons-eva/file-text-fill';
import clockFill from '@iconify/icons-eva/clock-fill';
import printerFill from '@iconify/icons-eva/printer-fill';
import baselineWork from '@iconify/icons-ic/baseline-work';

const getIcon = name => <Icon icon={name} width={22} height={22} />;

export const sidebarRoutes = [
   // {
   //   title: 'Dashboard',
   //   path: '/dashboard',
   //   icon: getIcon(pieChart2Fill),
   //   children: []
   // },
   {
      title: 'Customers',
      path: '/customers',
      icon: getIcon(peopleFill),
      children: [
         {
            title: 'Customers List',
            path: '/customers/customersList',
            icon: getIcon(clockFill)
         },
         {
            title: 'Recurring Customers List',
            path: '/customers/recurringCustomers',
            icon: getIcon(clockFill)
         }
      ]
   },
   {
      title: 'Transactions',
      path: '/transactions',
      icon: getIcon(clockFill),
      children: [
         {
            title: 'Transactions',
            path: '/transactions/customerTransactions',
            icon: getIcon(clockFill)
         },
         {
            title: 'Payments',
            path: '/transactions/customerPayments',
            icon: getIcon(clockFill)
         },
         {
            title: 'Retainers and Deposits',
            path: '/transactions/customerRetainers',
            icon: getIcon(clockFill)
         },
         {
            title: 'Write Offs',
            path: '/transactions/customerWriteOffs',
            icon: getIcon(clockFill)
         }
      ]
   },
   {
      title: 'Invoices',
      path: '/invoices',
      icon: getIcon(fileTextFill),
      children: [
         {
            title: 'Invoices',
            path: '/invoices/invoices',
            icon: getIcon(clockFill)
         },
         // {
         //   title: 'Quotes',
         //   path: '/invoices/quotes',
         //   icon: getIcon(clockFill)
         // },
         {
            title: 'Create Invoice',
            path: '/invoices/createInvoice',
            icon: getIcon(clockFill)
         }
         // {
         //   title: 'Create Quote',
         //   path: '/invoices/createQuote',
         //   icon: getIcon(clockFill)
         // }
      ]
   },
   {
      title: 'Jobs',
      path: '/jobs',
      icon: getIcon(baselineWork),
      children: [
         {
            title: 'Customer Jobs',
            path: '/jobs/jobsList',
            icon: getIcon(clockFill)
         },
         {
            title: 'Job Types',
            path: '/jobs/jobTypesList',
            icon: getIcon(clockFill)
         },
         {
            title: 'Job Categories',
            path: '/jobs/jobCategoriesList',
            icon: getIcon(clockFill)
         },
         {
            title: 'Work Descriptions',
            path: '/jobs/workDescriptionsList',
            icon: getIcon(clockFill)
         }
      ]
   },
   {
      title: 'Time Tracking',
      path: '/time-tracking',
      icon: getIcon(clockFill),
      children: [
         {
            title: 'Upload Time Tracker',
            path: '/time-tracking/upload',
            icon: getIcon(clockFill)
         },
         {
            title: 'Time Tracker History',
            path: '/time-tracking/history',
            icon: getIcon(fileTextFill)
         },
         {
            title: 'Tracking Administration',
            path: '/time-tracking/trackingAdministration',
            icon: getIcon(clockFill)
         },
         {
            title: 'Time Tracking Settings',
            path: '/time-tracking/settings',
            icon: getIcon(clockFill)
         }
      ]
   },
   {
      title: 'Account',
      path: '/account',
      icon: getIcon(printerFill),
      children: [
         {
            title: 'Account Users',
            path: '/account/accountUsers',
            icon: getIcon(clockFill)
         },
         {
            title: 'Account Settings',
            path: '/account/accountSettings',
            icon: getIcon(clockFill)
         }
      ]
   }
];

export default sidebarRoutes;
