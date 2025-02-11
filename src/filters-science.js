(function () {
  // DOM Selectors
  const SELECTORS = {
    yearFilterOption: "[data-year-filter-option]",
    blogItem: ".blog2_item",
    zeroState: "[data-filter-zero-state]",
    yearField: '[fs-cmsfilter-field="year"]',
    checkbox: ".filters1_form-radio1-icon"
  };

  // We can remove createElement since it's not being used
  
  const createFragment = (elements) => {
    const fragment = document.createDocumentFragment();
    elements.forEach((element) => {
      if (element) fragment.appendChild(element);  // Added null check
    });
    return fragment;
  };

  const createYearRange = (start, end) => {
    if (!start || !end || start > end) return [];  // Added validation
    return Array.from(
      { length: end - start + 1 },
      (_, i) => String(start + i)
    );
  };

  const collectYearsFromItems = () => {
    const items = document.querySelectorAll(SELECTORS.blogItem);
    const years = Array.from(items)
      .map(item => item.querySelector(SELECTORS.yearField)?.textContent)
      .filter(Boolean);  // Simplified year collection

    const sortedYears = [...new Set(years)]
      .map(Number)
      .filter((year) => !isNaN(year))
      .sort((a, b) => a - b);
    
    return sortedYears.length ? 
      createYearRange(sortedYears[0], sortedYears[sortedYears.length - 1]) : 
      [];
  };

  const createYearOption = (year, index) => {
    const yearOption = document.querySelector(SELECTORS.yearFilterOption);
    if (!yearOption) return null;

    const clone = yearOption.cloneNode(true);
    const checkbox = clone.querySelector(SELECTORS.checkbox);
    
    if (checkbox) {
      const checkboxId = `year-checkbox-${index + 1}`;
      checkbox.id = checkboxId;
      checkbox.name = checkboxId;
      checkbox.dataset.name = `Year Checkbox ${index + 1}`;
    }

    const yearField = clone.querySelector(SELECTORS.yearField);
    if (yearField) yearField.textContent = year;

    return clone;
  };

  const setYearOptions = (years) => {
    const yearOption = document.querySelector(SELECTORS.yearFilterOption);
    if (!yearOption?.parentElement) return;

    const yearElements = years.map((year, index) => 
      createYearOption(year, index)
    );

    yearOption.parentElement.appendChild(createFragment(yearElements));
    yearOption.remove();
  };

  const setupZeroState = (filterInstance) => {
    const zeroStateContainer = document.querySelector(SELECTORS.zeroState);
    if (!filterInstance?.listInstance || !zeroStateContainer) return;

    filterInstance.listInstance.on("renderitems", (renderedItems) => {
      zeroStateContainer.style.display = renderedItems.length > 0 ? "none" : "block";
    });
  };

  // Initialize
  const initializeFilters = () => {
    window.fsAttributes = window.fsAttributes || [];
    window.fsAttributes.push([
      "cmsfilter",
      (filterInstances) => {
        const [filterInstance] = filterInstances;
        
        const years = collectYearsFromItems();
        setYearOptions(years);
        setupZeroState(filterInstance);

        window.fsAttributes.cmsfilter.init();
      },
    ]);
  };

  // Start
  initializeFilters();
})();