(function () {
  // DOM Selectors
  const SELECTORS = {
    eventItem: ".blog2_item",
    sectionWrapper: ".whatons-grid",
    monthHeader: ".whats-on_month-header",
  };

  // Locale Utility
  const getCurrentLocale = () => {
    const path = window.location.pathname;
    if (path.startsWith("/en/")) return "EN";
    if (path.startsWith("/nl/")) return "EN";

    return "NL";
  };

  // Date Utilities
  const getMonthData = (date, monthOffset = 0) => {
    const targetDate = date.add(monthOffset, "month");

    return {
      month: targetDate.month(),
      year: targetDate.year(),
      formatted: targetDate.format("MMMM"),
    };
  };

  const isEventInMonth = (startDate, endDate, month, year) => {
    const targetStart = dayjs().set("month", month).set("year", year).startOf("month");
    const targetEnd = targetStart.endOf("month");

    return (
      (startDate.isSameOrBefore(targetEnd) && startDate.isSameOrAfter(targetStart)) ||
      (endDate.isSameOrAfter(targetStart) && endDate.isSameOrBefore(targetEnd)) ||
      (startDate.isBefore(targetStart) && endDate.isAfter(targetEnd))
    );
  };

  // Event Processing
  const categorizeEvent = (item, currentDate) => {
    const startDate = dayjs(item.getAttribute("data-start-date"));
    const endDate = dayjs(item.getAttribute("data-end-date"));

    if (!startDate.isValid() || !endDate.isValid()) return null;

    for (let i = 0; i < 3; i++) {
      const { month, year } = getMonthData(currentDate, i);
      if (isEventInMonth(startDate, endDate, month, year)) {
        return i === 0 ? "thisMonth" : i === 1 ? "nextMonth" : "twoMonths";
      }
    }

    return "upcoming";
  };

  const populateSection = (sectionId, items, monthOffset = null, currentDate) => {
    const section = document.querySelector(`#whats-on--${sectionId}`);
    if (!section) return;

    const wrapper = section.querySelector(SELECTORS.sectionWrapper);
    const header = section.querySelector(SELECTORS.monthHeader);

    if (monthOffset !== null && header) {
      const { formatted } = getMonthData(currentDate, monthOffset);
      header.textContent = formatted;
    }

    if (wrapper && items.length) {
      wrapper.append(...items);
    }
  };

  // Initialize
  const initializeEventSorting = () => {
    dayjs.locale(getCurrentLocale().toLowerCase());
    const currentDate = dayjs();

    console.log("locale", dayjs.locale());

    const sections = {
      thisMonth: [],
      nextMonth: [],
      twoMonths: [],
      upcoming: [],
    };

    // Sort events into sections
    document.querySelectorAll(SELECTORS.eventItem).forEach((item) => {
      const category = categorizeEvent(item, currentDate);
      if (category) {
        sections[category].push(item);
      }
    });

    // Populate sections
    populateSection("thisMonth", sections.thisMonth, 0, currentDate);
    populateSection("nextMonth", sections.nextMonth, 1, currentDate);
    populateSection("twoMonths", sections.twoMonths, 2, currentDate);
    populateSection("upcoming", sections.upcoming);

    document.querySelectorAll(SELECTORS.monthHeader).forEach((header) => {
      header.style.opacity = 1;
    });
  };

  // Start on DOM load
  document.addEventListener("DOMContentLoaded", initializeEventSorting);
})();
