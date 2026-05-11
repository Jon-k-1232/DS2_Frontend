const ROUTES = {
   tracker_upload_processed: '/time-tracking/history',
   rows_held_for_review: '/time-tracking/billingReview?tab=needsReview',
   new_customer_needs_addition: '/time-tracking/billingReview?tab=needsReview',
   ai_processing_failed: '/time-tracking/billingReview?tab=needsReview'
};

export const routeFor = type => ROUTES[type] || '/time-tracking/billingReview';
