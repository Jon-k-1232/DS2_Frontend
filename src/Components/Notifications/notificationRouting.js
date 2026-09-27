const ROUTES = {
   tracker_upload_processed: '/time-tracking/history',
   rows_held_for_review: '/work/review?tab=needsReview',
   new_customer_needs_addition: '/work/review?tab=needsReview',
   ai_processing_failed: '/work/review?tab=needsReview'
};

export const routeFor = type => ROUTES[type] || '/work/review';
