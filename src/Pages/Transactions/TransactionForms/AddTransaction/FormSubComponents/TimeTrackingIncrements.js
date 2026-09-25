import dayjs from 'dayjs';

// Same rule as backend timeAmounts: round each duration UP to six minutes.
export const sixMinuteIncrementTimeCalculation = (startTime, endTime, userInputMinutes) => {
   const supplied = userInputMinutes !== undefined && userInputMinutes !== null && userInputMinutes !== '';
   const minutes = supplied ? Number(userInputMinutes) : dayjs(endTime).diff(dayjs(startTime), 'minutes', true);
   if (!Number.isFinite(minutes) || minutes < 0) return NaN;
   return Math.ceil(minutes / 6) / 10;
};

export const priceQuantity = (quantity, rate) => Math.round(Math.round(Number(quantity) * 100) * Math.round(Number(rate) * 100) / 100) / 100;
