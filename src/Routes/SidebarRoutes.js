import { Icon } from '@iconify/react';
// import pieChart2Fill from '@iconify/icons-eva/pie-chart-2-fill';
import peopleFill from '@iconify/icons-eva/people-fill';
import fileTextFill from '@iconify/icons-eva/file-text-fill';
import clockFill from '@iconify/icons-eva/clock-fill';
import printerFill from '@iconify/icons-eva/printer-fill';
import baselineWork from '@iconify/icons-ic/baseline-work';
import { canAccessAccountAudit } from './AuditorProtectedAccess';
import { isSuperAdmin } from './SuperAdminAccess';

const getIcon = name => <Icon icon={name} width={22} height={22} />;

// Build a copy of the sidebar config with entries removed that the current
// user is not allowed to see. Used by DashboardSidebar at render time.
export const buildSidebarRoutes = loggedInUser => {
   const showAudit = canAccessAccountAudit(loggedInUser);
   const showSuperAdmin = isSuperAdmin(loggedInUser);
   return sidebarRoutes.map(group => {
      if (!group.children) return group;
      return {
         ...group,
         children: group.children.filter(child => {
            if (child.requiresAuditor && !showAudit) return false;
            if (child.requiresSuperAdmin && !showSuperAdmin) return false;
            return true;
         })
      };
   });
};

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
            title: 'Pending Payments',
            path: '/transactions/pendingPayments',
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
         },
         {
            title: 'Accounts Receivable',
            path: '/invoices/accountsReceivable',
            icon: getIcon(clockFill)
         },
         {
            title: 'Account Audit',
            path: '/invoices/accountAudit',
            icon: getIcon(clockFill),
            requiresAuditor: true
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
            title: 'Your Trackers',
            path: '/time-tracking/history',
            icon: getIcon(fileTextFill)
         },
         {
            title: 'Employee Trackers',
            path: '/time-tracking/trackingAdministration',
            icon: getIcon(clockFill)
         },
         {
            title: 'Transaction Review',
            path: '/time-tracking/billingReview',
            icon: getIcon(clockFill)
         },
         {
            title: 'Upload Master Tracker Template',
            path: '/time-tracking/update-template',
            icon: getIcon(fileTextFill),
            requiresSuperAdmin: true
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
            icon: getIcon(clockFill),
            requiresSuperAdmin: true
         },
         {
            title: 'Account Settings',
            path: '/account/accountSettings',
            icon: getIcon(clockFill)
         },
         {
            title: 'Automations',
            path: '/account/automations',
            icon: getIcon(clockFill)
         }
      ]
   }
];

export default sidebarRoutes;
