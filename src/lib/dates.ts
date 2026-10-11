// Friendly dates for the UI, made by splitting the "2026-07-13" string.
// We never use new Date() here: new Date("2026-07-13") reads the string as UTC
// midnight, so in US time zones it would show the day before (jul 12).

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "2026-07-13" -> { year: "2026", month: "jul", day: 13 }, or null if it isn't that format.
function splitDate(isoDate: string): { year: string; month: string; day: number } | null {
  const [year, month, day] = isoDate.split("-"); // like Python's year, month, day = s.split("-")
  const monthName = MONTHS[Number(month) - 1]; // "07" -> 7 -> index 6 -> "jul"
  const dayNumber = Number(day); // "03" -> 3, which drops the leading zero
  if (!year || monthName === undefined || !(dayNumber >= 1 && dayNumber <= 31)) {
    return null;
  }
  return { year, month: monthName, day: dayNumber };
}

// For chips: "2026-07-13" -> "jul 13". Anything unexpected is shown as stored.
export function shortDate(isoDate: string): string {
  const parts = splitDate(isoDate);
  return parts ? `${parts.month} ${parts.day}` : isoDate;
}

// For the memory panel, which has room for the year: "2026-07-13" -> "jul 13, 2026".
export function longDate(isoDate: string): string {
  const parts = splitDate(isoDate);
  return parts ? `${parts.month} ${parts.day}, ${parts.year}` : isoDate;
}
