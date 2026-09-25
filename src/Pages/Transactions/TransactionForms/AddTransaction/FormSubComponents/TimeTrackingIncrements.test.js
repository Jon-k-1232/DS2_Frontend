import dayjs from 'dayjs';
import { sixMinuteIncrementTimeCalculation, priceQuantity } from './TimeTrackingIncrements';
import { handleTimeCalculation } from './SharedTransactionsFunctions';
describe('manual time increment boundaries',()=>{
   test.each([[1,.1,13.75],[6,.1,13.75],[7,.2,27.5],[14,.3,41.25],[15,.3,41.25],[16,.3,41.25],[59,1,137.5],[60,1,137.5],[61,1.1,151.25]])('%s minutes -> %sh -> $%s',(minutes,hours,dollars)=>{
      const start=dayjs('2026-09-25T09:00:00');const end=start.add(minutes,'minute');
      expect(sixMinuteIncrementTimeCalculation(start,end,minutes)).toBe(hours);
      expect(sixMinuteIncrementTimeCalculation(start,end)).toBe(hours);
      expect(priceQuantity(hours,137.5)).toBe(dollars);
      const updates={};handleTimeCalculation(minutes,{billing_rate:137.5},start,end,(k,v)=>{updates[k]=v;});
      expect(updates).toEqual({quantity:hours,unitCost:137.5,minutes});
   });
   test('zero is zero; invalid or reversed timers refuse; half-cent prices round up',()=>{
      const start=dayjs('2026-09-25T09:00:00');
      expect(sixMinuteIncrementTimeCalculation(start,start,0)).toBe(0);
      expect(sixMinuteIncrementTimeCalculation(start,start.subtract(1,'minute'))).toBeNaN();
      expect(sixMinuteIncrementTimeCalculation(start,start,'invalid')).toBeNaN();
      expect(priceQuantity(.3,1.15)).toBe(.35);
   });
});
