import type { CalendarDay } from './types';

export const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (value: string) => {
  if (!value) return 'AAAA-MM-DD';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export const buildCalendar = (viewDate: Date, selectedValue: string): CalendarDay[] => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayValue = toDateValue(new Date());
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const value = toDateValue(date);

    return {
      date,
      value,
      inMonth: date.getMonth() === month,
      isSelected: value === selectedValue,
      isToday: value === todayValue,
    };
  });
};
