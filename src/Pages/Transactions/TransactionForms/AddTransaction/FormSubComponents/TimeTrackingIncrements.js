import dayjs from 'dayjs';

// takes time in minutes, by rate of user, and returns total cost by 6 min increment
export const sixMinuteIncrementTimeCalculation = (startTime, endTime, userInputMinutes) => {
  const mins = userInputMinutes ? Number(userInputMinutes) : endTime.diff(startTime, 'minutes', true);
  const totalHours = parseInt(mins / 60);
  const manualMinutes = userInputMinutes < 60 ? mins : mins - Math.floor(totalHours) * 60;
  const totalMins = userInputMinutes ? manualMinutes : dayjs().minute(mins).$m + 1;

  const sixMinuteIncrements = Math.ceil(totalMins / 6);
  const totalTimeInHours = totalHours + sixMinuteIncrements / 10;

  return totalTimeInHours;
};
