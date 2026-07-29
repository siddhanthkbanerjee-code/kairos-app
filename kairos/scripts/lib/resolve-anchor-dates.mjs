const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function atMidnight(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

function weekdaysInMonth(year, month, weekdayIndex) {
  const dates = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    if (cursor.getDay() === weekdayIndex) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function nextMonth(year, month) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

export function resolveAnchorDates(pattern, fromDate = new Date(), count = 2) {
  // Scan starts tomorrow, not today: avoids surfacing a nightly/weekly anchor as
  // "upcoming" when today's edition may have already started by the time this runs.
  const start = addDays(atMidnight(fromDate), 1);
  const results = [];

  if (pattern.type === "nightly" || pattern.type === "weekly") {
    const dayIndices = (pattern.type === "nightly" ? WEEKDAYS : pattern.days.map((d) => d.toLowerCase())).map(
      (d) => WEEKDAYS.indexOf(d)
    );
    let cursor = new Date(start);
    let guard = 0;
    while (results.length < count && guard < 90) {
      if (dayIndices.includes(cursor.getDay())) results.push(toISODate(cursor));
      cursor = addDays(cursor, 1);
      guard += 1;
    }
    return results;
  }

  if (pattern.type === "monthly-nth-weekday") {
    const weekdayIndex = WEEKDAYS.indexOf(pattern.weekday.toLowerCase());
    const excludeMonths = new Set(pattern.excludeMonths ?? []);
    let { year, month } = { year: start.getFullYear(), month: start.getMonth() };
    let guard = 0;
    while (results.length < count && guard < 36) {
      if (!excludeMonths.has(month + 1)) {
        const occurrences = weekdaysInMonth(year, month, weekdayIndex);
        const target = pattern.nth > 0 ? occurrences[pattern.nth - 1] : occurrences[occurrences.length + pattern.nth];
        if (target && target >= start) results.push(toISODate(target));
      }
      ({ year, month } = nextMonth(year, month));
      guard += 1;
    }
    return results;
  }

  if (pattern.type === "twice-monthly") {
    const weekdayIndex = WEEKDAYS.indexOf(pattern.weekday.toLowerCase());
    let { year, month } = { year: start.getFullYear(), month: start.getMonth() };
    let guard = 0;
    while (results.length < count && guard < 36) {
      const occurrences = weekdaysInMonth(year, month, weekdayIndex);
      const picks = [occurrences[0], occurrences[2]].filter(Boolean);
      for (const pick of picks) {
        if (pick >= start && results.length < count) results.push(toISODate(pick));
      }
      ({ year, month } = nextMonth(year, month));
      guard += 1;
    }
    return results;
  }

  throw new Error(`Unknown anchor pattern type: ${pattern.type}`);
}
