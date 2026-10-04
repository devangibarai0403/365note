/**
 * Time utility to calculate elapsed hours between two time strings
 * Supports formats like "05:00 PM", "5:00 PM", "17:00", "05:00"
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();

  // Match 12-hour format e.g. "05:30 PM" or "5:00PM"
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3];

    if (meridiem) {
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
  }

  // Match 24-hour format e.g. "17:30"
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

export function calculateDurationHours(fromTime: string, toTime: string): number {
  const fromMinutes = parseTimeToMinutes(fromTime);
  const toMinutes = parseTimeToMinutes(toTime);

  if (fromMinutes === null || toMinutes === null) {
    return 0;
  }

  let diff = toMinutes - fromMinutes;
  // If end time is past midnight (e.g. 11 PM to 1 AM)
  if (diff < 0) {
    diff += 24 * 60;
  }

  // Round to 2 decimal places (e.g. 1.5 hours)
  const hours = diff / 60;
  return Math.round(hours * 100) / 100;
}

export function formatTimeDisplay(timeStr: string): string {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return timeStr;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;

  return `${displayH}:${displayM} ${meridiem}`;
}

export function getMonthDateRange(monthStr: string): { startDate: string; endDate: string } {
  if (!monthStr || !monthStr.includes('-')) {
    const now = new Date();
    monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const m = parseInt(monthNumStr, 10);
  const lastDay = new Date(year, m, 0).getDate();
  const startDate = `${yearStr}-${monthNumStr.padStart(2, '0')}-01`;
  const endDate = `${yearStr}-${monthNumStr.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}
