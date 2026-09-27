import {lazy,Suspense} from 'react';
import RouteLoading from './RouteLoading';
import { Route } from "react-router-dom";
import ManagerGuard from "./ManagerAndAdminProtectedAccess";
import AdminGuard from "./AdminProtectedAccess";
import SuperGuard from "./SuperAdminAccess";
import LegacyRedirect from "./LegacyRedirect";
import legacyRoutes from "./legacyRoutes.json";
import { editorRoutes } from "./routePaths";
import SelectionRecovery from '../Components/Workspace/SelectionRecovery';
const RecordPage = lazy(() => import('./RecordPage'));
const Customers = lazy(() => import('../Pages/Customer/CustomerGrids/CustomerGrid'));
const CustomerProfileSubRoutes = lazy(() => import('./GroupedRoutes/CustomerRoutes/CustomerProfileSubRoutes'));
const TransactionsGrid = lazy(() => import('../Pages/Transactions/TransactionGrids/TransactionsGrid'));
const JobsGrid = lazy(() => import('../Pages/Jobs/JobGrids/JobsGrid'));
const BillingReviewPage = lazy(() => import('../Pages/Transactions/BillingReview/BillingReviewPage'));
const EntityReviewPage = lazy(() => import('../Pages/BillingEntities/EntityReviewPage'));
const PossibleDuplicates = lazy(() => import('../Pages/Transactions/Duplicates/PossibleDuplicates'));
const CreateNewInvoices = lazy(() => import('../Pages/Invoices/CreateNewInvoice/CreateNewInvoices'));
const InvoicesGrid = lazy(() => import('../Pages/Invoices/InvoiceGrids/InvoicesGrid'));
const InvoiceSubRoutes = lazy(() => import('./GroupedRoutes/InvoiceRoutes/InvoiceSubRoutes'));
const QuotesGrid = lazy(() => import('../Pages/Invoices/InvoiceGrids/QuotesGrid'));
const RecurringPlansPage = lazy(() => import('../Pages/RecurringCustomer/RecurringPlansPage'));
const CorrectionRegister = lazy(() => import('../Pages/Corrections/CorrectionRegister'));
const ReceivePaymentPage = lazy(() => import('../Pages/Payments/ReceivePaymentPage'));
const ReceiptsPage = lazy(() => import('../Pages/Payments/ReceiptsPage'));
const PaymentsGrid = lazy(() => import('../Pages/Transactions/TransactionGrids/PaymentsGrid'));
const ReceiptDetailPage = lazy(() => import('../Pages/Payments/ReceiptDetailPage'));
const PendingPaymentsPage = lazy(() => import('../Pages/Transactions/PendingPayments/PendingPaymentsPage'));
const CreditsPage = lazy(() => import('../Pages/Corrections/CreditsPage'));
const RetainersGrid = lazy(() => import('../Pages/Transactions/TransactionGrids/RetainersGrid'));
const CreditTransferPage = lazy(() => import('../Pages/BillingEntities/CreditTransferPage'));
const AccountsReceivablePage = lazy(() => import('../Pages/AccountsReceivable/AccountsReceivablePage'));
const WriteOffsGrid = lazy(() => import('../Pages/Transactions/TransactionGrids/WriteOffsGrid'));
const BillingPerformancePage = lazy(() => import('../Pages/Analytics/BillingPerformancePage'));
const ClientRatesPage = lazy(() => import('../Pages/Analytics/ClientRatesPage'));
const TimeAllocationPage = lazy(() => import('../Pages/Analytics/TimeAllocationPage'));
const WipAgingPage = lazy(() => import('../Pages/Analytics/WipAgingPage'));
const JobBudgetsPage = lazy(() => import('../Pages/Analytics/JobBudgetsPage'));
const TaxSeasonCapacityPage = lazy(() => import('../Pages/Analytics/TaxSeasonCapacityPage'));
const AccountAuditPage = lazy(() => import('../Pages/AccountAudit/AccountAuditPage'));
const UploadTimeTracker = lazy(() => import('../Pages/TimeTracking/Upload/UploadTimeTracker'));
const TimeTrackerHistory = lazy(() => import('../Pages/TimeTracking/History/TimeTrackerHistory'));
const EmployeeTimeTrackerSubRoutes = lazy(() => import('./GroupedRoutes/TransactionRoutes/EmployeeEntrySubRoutes'));
const BillingEntitiesPage = lazy(() => import('../Pages/BillingEntities/BillingEntitiesPage'));
const CutoverPage = lazy(() => import('../Pages/BillingEntities/CutoverPage'));
const AccountSettings = lazy(() => import('../Pages/Account/AccountSettings/AccountSettings'));
const AccountUsersGrid = lazy(() => import('../Pages/Account/AccountGrids/AccountUsersGrid'));
const AccountAutomations = lazy(() => import('../Pages/Account/Automations/AccountAutomations'));
const JobCatagoriesGrid = lazy(() => import('../Pages/Jobs/JobGrids/JobCatagoriesGrid'));
const JobTypesGrid = lazy(() => import('../Pages/Jobs/JobGrids/JobTypesGrid'));
const WorkDescriptionsGrid = lazy(() => import('../Pages/WorkDescriptions/WorkDescriptionGrids/WorkDescriptionGrids'));
const UpdateTimeTrackerTemplate = lazy(() => import('../Pages/TimeTracking/TemplateUpdate/UpdateTimeTrackerTemplate'));
const TimeTrackingSettings = lazy(() => import('../Pages/Account/TimeTrackingSettings/TimeTrackingSettings'));

const protect = (permission, page) => permission === "admin" ? <AdminGuard>{page}</AdminGuard> : permission === "super" ? <SuperGuard>{page}</SuperGuard> : permission === "manager" ? <ManagerGuard>{page}</ManagerGuard> : page;
const guard=(permission,page)=>protect(permission,<Suspense fallback={<RouteLoading/>}>{page}</Suspense>);
export default function workspaceRoutes(props) {
 return [
  <Route key='/clients' path='/clients' element={guard('manager', <Customers {...props}/>)}/>,
  <Route key='/clients/:customerId/*' path='/clients/:customerId/*' element={guard('manager', <CustomerProfileSubRoutes {...props}/>)}/>,
  <Route key='/work/entries' path='/work/entries' element={guard('manager', <TransactionsGrid {...props}/>)}/>,
  <Route key='/work/jobs' path='/work/jobs' element={guard('manager', <JobsGrid {...props}/>)}/>,
  <Route key='/work/review' path='/work/review' element={guard('manager', <BillingReviewPage {...props}/>)}/>,
  <Route key='/work/review/entities' path='/work/review/entities' element={guard('admin', <EntityReviewPage {...props}/>)}/>,
  <Route key='/work/duplicates' path='/work/duplicates' element={guard('manager', <PossibleDuplicates {...props}/>)}/>,
  <Route key='/billing/create' path='/billing/create' element={guard('manager', <CreateNewInvoices {...props}/>)}/>,
  <Route key='/billing/invoices' path='/billing/invoices' element={guard('manager', <InvoicesGrid {...props}/>)}/>,
  <Route key='/billing/invoices/selected/*' path='/billing/invoices/selected/*' element={guard('manager', <SelectionRecovery {...props}/>)}/>,
  <Route key='/billing/invoices/:invoiceId/*' path='/billing/invoices/:invoiceId/*' element={guard('manager', <InvoiceSubRoutes {...props}/>)}/>,
  <Route key='/billing/quotes' path='/billing/quotes' element={guard('manager', <QuotesGrid {...props}/>)}/>,
  <Route key='/billing/recurring' path='/billing/recurring' element={guard('manager', <RecurringPlansPage {...props}/>)}/>,
  <Route key='/billing/recurring/:planId' path='/billing/recurring/:planId' element={guard('manager', <RecurringPlansPage {...props}/>)}/>,
  <Route key='/billing/credit-memos' path='/billing/credit-memos' element={guard('manager', <CorrectionRegister {...props}/>)}/>,
  <Route key='/payments/receive' path='/payments/receive' element={guard('manager', <ReceivePaymentPage {...props}/>)}/>,
  <Route key='/payments/receipts' path='/payments/receipts' element={guard('manager', <ReceiptsPage {...props}/>)}/>,
  <Route key='/payments/receipts/legacy' path='/payments/receipts/legacy' element={guard('manager', <PaymentsGrid {...props}/>)}/>,
  <Route key='/payments/receipts/:receiptId' path='/payments/receipts/:receiptId' element={guard('manager', <ReceiptDetailPage {...props}/>)}/>,
  <Route key='/payments/imports' path='/payments/imports' element={guard('manager', <PendingPaymentsPage {...props}/>)}/>,
  <Route key='/payments/credits' path='/payments/credits' element={guard('manager', <CreditsPage {...props}/>)}/>,
  <Route key='/payments/retainers' path='/payments/retainers' element={guard('manager', <RetainersGrid {...props}/>)}/>,
  <Route key='/payments/refunds' path='/payments/refunds' element={guard('manager', <CorrectionRegister {...props} kind='refunds'/>)}/>,
  <Route key='/payments/transfers' path='/payments/transfers' element={guard('staff', <CreditTransferPage {...props}/>)}/>,
  <Route key='/receivables/aging' path='/receivables/aging' element={guard('manager', <AccountsReceivablePage {...props}/>)}/>,
  <Route key='/receivables/write-offs' path='/receivables/write-offs' element={guard('manager', <WriteOffsGrid {...props}/>)}/>,
  <Route key='/reports/billing-performance' path='/reports/billing-performance' element={guard('super', <BillingPerformancePage {...props}/>)}/>,
  <Route key='/reports/client-rates' path='/reports/client-rates' element={guard('super', <ClientRatesPage {...props}/>)}/>,
  <Route key='/reports/time-allocation' path='/reports/time-allocation' element={guard('super', <TimeAllocationPage {...props}/>)}/>,
  <Route key='/reports/wip-aging' path='/reports/wip-aging' element={guard('super', <WipAgingPage {...props}/>)}/>,
  <Route key='/reports/job-budgets' path='/reports/job-budgets' element={guard('super', <JobBudgetsPage {...props}/>)}/>,
  <Route key='/reports/tax-capacity' path='/reports/tax-capacity' element={guard('super', <TaxSeasonCapacityPage {...props}/>)}/>,
  <Route key='/reports/account-audit' path='/reports/account-audit' element={guard('super', <AccountAuditPage {...props}/>)}/>,
  <Route key='/time-tracking/upload' path='/time-tracking/upload' element={guard('staff', <UploadTimeTracker {...props}/>)}/>,
  <Route key='/time-tracking/history' path='/time-tracking/history' element={guard('staff', <TimeTrackerHistory {...props}/>)}/>,
  <Route key='/time-tracking/trackingAdministration/*' path='/time-tracking/trackingAdministration/*' element={guard('manager', <EmployeeTimeTrackerSubRoutes {...props}/>)}/>,
  <Route key='/settings/entities' path='/settings/entities' element={guard('admin', <BillingEntitiesPage {...props}/>)}/>,
  <Route key='/settings/entities/cutover' path='/settings/entities/cutover' element={guard('admin', <CutoverPage {...props}/>)}/>,
  <Route key='/settings/entities/:entityId' path='/settings/entities/:entityId' element={guard('admin', <BillingEntitiesPage {...props}/>)}/>,
  <Route key='/settings/account' path='/settings/account' element={guard('admin', <AccountSettings {...props}/>)}/>,
  <Route key='/settings/users' path='/settings/users' element={guard('super', <AccountUsersGrid {...props}/>)}/>,
  <Route key='/settings/automations' path='/settings/automations' element={guard('admin', <AccountAutomations {...props}/>)}/>,
  <Route key='/settings/job-categories' path='/settings/job-categories' element={guard('manager', <JobCatagoriesGrid {...props}/>)}/>,
  <Route key='/settings/job-types' path='/settings/job-types' element={guard('manager', <JobTypesGrid {...props}/>)}/>,
  <Route key='/settings/work-descriptions' path='/settings/work-descriptions' element={guard('manager', <WorkDescriptionsGrid {...props}/>)}/>,
  <Route key='/settings/tracker-template' path='/settings/tracker-template' element={guard('super', <UpdateTimeTrackerTemplate {...props}/>)}/>,
  <Route key='/settings/tracker' path='/settings/tracker' element={guard('manager', <TimeTrackingSettings {...props}/>)}/>,
  <Route key='/work/entries/:customerId/:recordId/:action' path='/work/entries/:customerId/:recordId/:action' element={guard('manager', <RecordPage kind='transaction' {...props}/>)}/>,
  <Route key='/work/entries/selected' path='/work/entries/selected' element={guard('manager', <SelectionRecovery/>)}/>,
  <Route key='/payments/receipts/legacy/:recordId/:action' path='/payments/receipts/legacy/:recordId/:action' element={guard('manager', <RecordPage kind='payment' {...props}/>)}/>,
  <Route key='/payments/receipts/legacy/selected' path='/payments/receipts/legacy/selected' element={guard('manager', <SelectionRecovery/>)}/>,
  <Route key='/payments/retainers/:recordId/:action' path='/payments/retainers/:recordId/:action' element={guard('manager', <RecordPage kind='retainer' {...props}/>)}/>,
  <Route key='/payments/retainers/selected' path='/payments/retainers/selected' element={guard('manager', <SelectionRecovery/>)}/>,
  <Route key='/receivables/write-offs/:recordId/:action' path='/receivables/write-offs/:recordId/:action' element={guard('admin', <RecordPage kind='writeoff' {...props}/>)}/>,
  <Route key='/receivables/write-offs/selected' path='/receivables/write-offs/selected' element={guard('admin', <SelectionRecovery/>)}/>,
  <Route key='/work/jobs/:recordId/:action' path='/work/jobs/:recordId/:action' element={guard('manager', <RecordPage kind='job' {...props}/>)}/>,
  <Route key='/work/jobs/selected' path='/work/jobs/selected' element={guard('manager', <SelectionRecovery/>)}/>,
  <Route key='/settings/job-types/:recordId/:action' path='/settings/job-types/:recordId/:action' element={guard('manager', <RecordPage kind='jobType' {...props}/>)}/>,
  <Route key='/settings/job-types/selected' path='/settings/job-types/selected' element={guard('manager', <SelectionRecovery/>)}/>,
  <Route key='/settings/job-categories/:recordId/:action' path='/settings/job-categories/:recordId/:action' element={guard('manager', <RecordPage kind='jobCategory' {...props}/>)}/>,
  <Route key='/settings/job-categories/selected' path='/settings/job-categories/selected' element={guard('manager', <SelectionRecovery/>)}/>,
  <Route key='/settings/work-descriptions/:recordId/:action' path='/settings/work-descriptions/:recordId/:action' element={guard('manager', <RecordPage kind='workDescription' {...props}/>)}/>,
  <Route key='/settings/work-descriptions/selected' path='/settings/work-descriptions/selected' element={guard('manager', <SelectionRecovery/>)}/>,
  <Route key='/settings/users/:recordId/:action' path='/settings/users/:recordId/:action' element={guard('super', <RecordPage kind='user' {...props}/>)}/>,
  <Route key='/settings/users/selected' path='/settings/users/selected' element={guard('super', <SelectionRecovery/>)}/>,
  ...Object.keys(editorRoutes).flatMap(base => Object.keys(editorRoutes[base].actions).map(action => <Route key={base+action} path={`${base}/${action}`} element={<LegacyRedirect/>}/>)),
  ...[...Object.keys(legacyRoutes), "/customers", "/transactions", "/invoices", "/jobs", "/analytics", "/account"].map(path => <Route key={path} path={`${path}/*`} element={<LegacyRedirect/>}/>),
 ];
}
