(function () {
  // DOM Selectors
  const SELECTORS = {
    yearFilterOption: "[data-year-filter-option]",
    listItems: "[data-list-item]",
    zeroState: "[data-filter-zero-state]",
    listItemDetails: ".list-item_details-wrapper",
    gridItem: "[data-grid-item]",
  };

  // DOM Utilities
  const createElement = (tag, attributes = {}, text = "") => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    if (text) element.textContent = text;
    return element;
  };

  const createFragment = (elements) => {
    const fragment = document.createDocumentFragment();
    elements.forEach((element) => fragment.appendChild(element));
    return fragment;
  };

  // Year Utilities
  const createYearRange = (start, end) => {
    if (!start || !end) return [];
    const startYear = Number(start);
    const endYear = Number(end);
    if (startYear === endYear) return [String(startYear)];
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => String(startYear + i));
  };

  const createFilterElement = (value, type = "year") =>
    createElement(
      "div",
      {
        "fs-cmsfilter-field": type,
        class: "display-none",
      },
      value
    );

  // Filter operations
  const appendElements = (container, items, type) => {
    if (!container || !items.length) return;
    const elements = items.map((item) => createFilterElement(item, type));
    container.appendChild(createFragment(elements));
  };

  const setYearOptions = (years) => {
    const yearOption = document.querySelector(SELECTORS.yearFilterOption);
    if (!yearOption?.parentElement) return;

    const sortedYears = [...new Set(years)]
      .map(Number)
      .filter((year) => !isNaN(year))
      .sort((a, b) => a - b);

    if (!sortedYears.length) {
      yearOption.remove();
      return;
    }

    const filledYears = createYearRange(String(sortedYears[0]), String(sortedYears[sortedYears.length - 1]));

    const yearElements = filledYears.map((year, index) => {
      const clone = yearOption.cloneNode(true);
      const checkbox = clone.querySelector(".filters1_form-radio1-icon");

      if (checkbox) {
        const checkboxId = `year-checkbox-${index + 1}`;
        checkbox.id = checkbox.name = checkboxId;
        checkbox.dataset.name = `Year Checkbox ${index + 1}`;
      }

      const yearField = clone.querySelector('[fs-cmsfilter-field="year"]');
      if (yearField) yearField.textContent = year;

      return clone;
    });

    yearOption.parentElement.appendChild(createFragment(yearElements));
    yearOption.remove();
  };

  const processBlogItem = ({ slug, years, locations }) => {
    const blogItem = document.querySelector(`${SELECTORS.gridItem}[data-item-slug="${slug}"]`);
    if (!blogItem) return;

    const container = blogItem.querySelector(".tag");
    if (!container) return;

    appendElements(container, years, "year");
    appendElements(container, locations, "location");
  };

  const processListItems = () => {
    const items = document.querySelectorAll(SELECTORS.listItems);
    const years = new Set();

    items.forEach((item) => {
      const slug = item.getAttribute("data-item-slug");
      const startYear = item.getAttribute("data-start-year");
      const endYear = item.getAttribute("data-end-year");

      const itemYears = createYearRange(startYear, endYear).filter(Boolean);
      const locationElements = item.querySelectorAll('[fs-cmsfilter-field="location"]');
      const locations = Array.from(locationElements, (el) => el.textContent.trim());

      const container = item.querySelector(SELECTORS.listItemDetails);
      if (container) {
        appendElements(container, itemYears, "year");
      }

      processBlogItem({ years: itemYears, slug, locations });
      itemYears.forEach((year) => years.add(year));
    });

    return Array.from(years);
  };

  const initializeFilters = () => {
    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push([
      "cmsfilter",
      (filterInstances) => {
        const [filterInstance] = filterInstances;
        const zeroStateContainer = document.querySelector(SELECTORS.zeroState);

        const listYears = processListItems();
        setYearOptions(listYears);

        if (filterInstance?.listInstance && zeroStateContainer) {
          filterInstance.listInstance.on("renderitems", (renderedItems) => {
            zeroStateContainer.style.display = renderedItems.length ? "none" : "block";
          });
        }

        window.fsAttributes.cmsfilter.init();
      },
    ]);
  };

  // Initialize
  initializeFilters();
})();