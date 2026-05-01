import { routeFor } from './notificationRouting';

describe('notificationRouting routeFor', () => {
   it('routes tracker_upload_processed to history', () => {
      expect(routeFor('tracker_upload_processed')).toBe('/time-tracking/history');
   });

   it('routes rows_held_for_review to billingReview needsReview tab', () => {
      expect(routeFor('rows_held_for_review')).toBe('/transactions/billingReview?tab=needsReview');
   });

   it('routes new_customer_needs_addition to billingReview needsReview tab', () => {
      expect(routeFor('new_customer_needs_addition')).toBe('/transactions/billingReview?tab=needsReview');
   });

   it('falls back to billingReview root for unknown types', () => {
      expect(routeFor('completely_unknown_type')).toBe('/transactions/billingReview');
   });
});
