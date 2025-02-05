(function () {
  // DOM Selectors
  const SELECTORS = {
    container: ".project-dates",
    start: ".project-date_start",
    end: ".project-date_end",
    separator: ".project-date_separator",
  };

  // CSS Classes
  const CLASSES = {
    hidden: "display-none",
  };

  // DOM Utilities
  const getDateElements = (container) => ({
    start: container.querySelector(SELECTORS.start),
    end: container.querySelector(SELECTORS.end),
    separator: container.querySelector(SELECTORS.separator),
  });

  const hideElements = (elements) => {
    elements.forEach((element) => element.classList.add(CLASSES.hidden));
  };

  // Date Processing
  const shouldHideSeparator = (startElement, endElement) => startElement.textContent === endElement.textContent;

  const processDates = () => {
    const container = document.querySelector(SELECTORS.container);
    if (!container) return;

    const elements = getDateElements(container);
    const { start, end, separator } = elements;

    if (!start || !end || !separator) return;

    if (shouldHideSeparator(start, end)) {
      hideElements([separator, end]);
    }
  };

  // Initialize
  document.addEventListener("DOMContentLoaded", processDates);
})();
