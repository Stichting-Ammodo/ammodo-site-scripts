(function () {
  // DOM Selectors
  const SELECTORS = {
    richText: ".w-richtext[rte-image-rows]",
    figure: "figure",
    figcaption: "figcaption",
  };

  // Constants
  const MARKERS = {
    wrapper: "[row]",
    newWrapper: "[new-row]",
  };

  const CLASSES = {
    wrapper: "rte-image-row",
  };

  // DOM Utilities
  const createWrapper = () => {
    const wrapper = document.createElement("div");
    wrapper.classList.add(CLASSES.wrapper);
    return wrapper;
  };

  const processCaption = (caption, markers) => {
    const text = caption.textContent.trim();
    return {
      text,
      isNewWrapper: text.includes(markers.newWrapper),
      isWrapper: text.includes(markers.wrapper),
      hasMarker: text.includes("["),
    };
  };

  const updateCaptionText = (caption, text, markers) => {
    caption.textContent = text.replace(markers.newWrapper, "").replace(markers.wrapper, "").trim();
  };

  // Figure Processing
  const processFigureCaption = (figure, caption, state) => {
    const { text, isNewWrapper, isWrapper, hasMarker } = processCaption(caption, MARKERS);

    // Reset wrapper if new wrapper requested or not a wrapper
    if ((isNewWrapper || !isWrapper) && state.currentWrapper) {
      state.currentWrapper = null;
    }

    // Skip non-wrapper captions without markers
    if (!isWrapper && !isNewWrapper && !hasMarker) {
      state.previousMarker = false;
      return;
    }

    if (isWrapper || isNewWrapper || state.previousMarker) {
      if (!state.currentWrapper) {
        state.currentWrapper = createWrapper();
        figure.replaceWith(state.currentWrapper);
      }

      state.currentWrapper.appendChild(figure);
      updateCaptionText(caption, text, MARKERS);
    }

    state.previousMarker = isWrapper || isNewWrapper;
  };

  const processFigure = (figure, state) => {
    const captions = figure.querySelectorAll(SELECTORS.figcaption);
    if (!captions.length) return;

    captions.forEach((caption) => processFigureCaption(figure, caption, state));
  };

  // Main Processing
  const processRichTextElement = (element) => {
    const state = {
      currentWrapper: null,
      previousMarker: false,
    };

    const figures = element.querySelectorAll(SELECTORS.figure);
    figures.forEach((figure) => processFigure(figure, state));
  };

  // Initialize
  const initializeRichTextProcessing = () => {
    const richTextElements = document.querySelectorAll(SELECTORS.richText);
    richTextElements.forEach(processRichTextElement);
  };

  // Start processing
  document.addEventListener("DOMContentLoaded", initializeRichTextProcessing);
})();
