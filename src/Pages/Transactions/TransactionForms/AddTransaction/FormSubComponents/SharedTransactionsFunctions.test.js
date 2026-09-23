import dayjs from 'dayjs';
import { handleTimeCalculation, handleBillableStatus } from './SharedTransactionsFunctions';

const memberAt = rate => ({ user_id: 1, billing_rate: rate });

describe('handleTimeCalculation', () => {
   it('prices quantity/unitCost off the CURRENT team member, not a stale one', () => {
      const updates = {};
      const updateSelectedItems = (key, value) => {
         updates[key] = value;
      };

      // 63 raw minutes (1.05h) rounds up to the next 6-minute increment (1.1h).
      const start = dayjs();
      const end = dayjs();
      handleTimeCalculation(63, memberAt(150), start, end, updateSelectedItems);

      expect(updates.quantity).toBeCloseTo(1.1);
      expect(updates.unitCost).toBe(150);

      // Switching team members after hours are already typed must reprice off
      // the NEW member's rate — this is the exact regression TimeOptions.js
      // guards against by including selectedTeamMember in its effect deps.
      const updatesAfterSwitch = {};
      const updateAfterSwitch = (key, value) => {
         updatesAfterSwitch[key] = value;
      };
      handleTimeCalculation(63, memberAt(225), start, end, updateAfterSwitch);
      expect(updatesAfterSwitch.unitCost).toBe(225);
      expect(updatesAfterSwitch.quantity).toBeCloseTo(1.1);
   });

   it('derives minutes from the SAME rounded hours used for quantity/total, not the raw typed duration', () => {
      // Manual Submission (ReviewBillingDialog -> applyHeldEntry) sends
      // `minutes` as duration_minutes, and the backend derives its OWN
      // hours/total from that value alone (billingReview-service.js:
      // hours = round2(duration_minutes / 60)). If minutes were left as the
      // raw 63, the backend would compute 1.05h — a different number than the
      // 1.1h quantity/Total already shown on screen from the 6-minute-
      // increment rounding below.
      const updates = {};
      const updateSelectedItems = (key, value) => {
         updates[key] = value;
      };

      handleTimeCalculation(63, memberAt(150), dayjs(), dayjs(), updateSelectedItems);

      expect(updates.quantity).toBeCloseTo(1.1);
      expect(updates.minutes).toBe(Math.round(updates.quantity * 60));
      expect(updates.minutes).toBe(66);
   });

   it('resets minutes (not just quantity/unitCost) when the duration is cleared', () => {
      const updates = {};
      const updateSelectedItems = (key, value) => {
         updates[key] = value;
      };
      // Suppress the "select a team member" alert this branch fires when there's no member.
      const originalAlert = global.alert;
      global.alert = () => {};

      handleTimeCalculation(0, memberAt(150), dayjs(), dayjs(), updateSelectedItems);

      global.alert = originalAlert;

      expect(updates.quantity).toBe(1);
      expect(updates.unitCost).toBe(0);
      expect(updates.minutes).toBeNull();
   });
});

describe('handleBillableStatus', () => {
   it('forces non-billable for a recurring customer\'s regular (non-additional) work', () => {
      expect(handleBillableStatus({ is_recurring: true }, false, true)).toBe(false);
   });

   it('flips billable back on when marked "in addition to" the monthly charge', () => {
      expect(handleBillableStatus({ is_recurring: true }, true, false)).toBe(true);
   });

   it('leaves billable untouched for a non-recurring customer', () => {
      expect(handleBillableStatus({ is_recurring: false }, false, true)).toBe(true);
      expect(handleBillableStatus({ is_recurring: false }, false, false)).toBe(false);
   });
});
