const ROUTES = {
   tracker_upload_processed: '/time-tracking/history',
   rows_held_for_review: '/transactions/billingReview?tab=needsReview',
   new_customer_needs_addition: '/transactions/billingReview?tab=needsReview',
   ai_processing_failed: '/transactions/billingReview?tab=needsReview'
};

export const routeFor = type => ROUTES[type] || '/transactions/billingReview';
