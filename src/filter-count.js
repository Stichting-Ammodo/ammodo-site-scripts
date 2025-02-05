// DOM Selectors
const SELECTORS = {
  clearButton: '[fs-cmsfilter-element="clear"]',
  filterCategories: '[data-filter-category]',
  tabCount: '.tabs-item_count',
  filtersContainer: '.filters_tabs-container',
  activeFilter: '.fs-cmsfilter_active',
  filterField: '[fs-cmsfilter-field]'
};

// DOM Utilities
const getFilterField = (element) => 
  element.querySelector(SELECTORS.filterField)?.getAttribute('fs-cmsfilter-field');

const getFilterCount = (element, count) => {
  const countElement = element.querySelector(SELECTORS.tabCount);
  if (!countElement) return;
  countElement.textContent = count ? `(${count})` : '';
};

// Filter operations
const clearFilterCounts = () => {
  const categories = document.querySelectorAll(SELECTORS.filterCategories);
  categories.forEach(category => getFilterCount(category, 0));
};

const setFilterCounts = (filterCounts) => {
  const categories = document.querySelectorAll(SELECTORS.filterCategories);
  categories.forEach(category => {
    const categoryType = category.getAttribute('data-filter-category');
    getFilterCount(category, filterCounts[categoryType] || 0);
  });
};

const updateFilterCounts = () => {
  const filterCounts = {};
  const activeFilters = document.querySelectorAll(SELECTORS.activeFilter);

  activeFilters.forEach(filter => {
    const category = getFilterField(filter);
    if (category) {
      filterCounts[category] = (filterCounts[category] || 0) + 1;
    }
  });

  setFilterCounts(filterCounts);
};

// Initialize
const initializeFilterCounts = () => {
  const clearButton = document.querySelector(SELECTORS.clearButton);
  const filtersContainer = document.querySelector(SELECTORS.filtersContainer);

  if (filtersContainer) {
    filtersContainer.addEventListener('click', (event) => {
      if (event.target.closest(SELECTORS.filterField)) {
        requestAnimationFrame(updateFilterCounts);
      }
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', clearFilterCounts);
  }
};

// Start on DOM load
document.addEventListener('DOMContentLoaded', initializeFilterCounts);