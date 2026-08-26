/**
 * Ammodo — projects world map
 *
 * Renders a MapLibre world map behind the projects grid and turns the existing
 * "world view" button into a map/grid toggle.
 *
 * Project data is read from whatever Collection List is on the page, so the
 * same script works on /projects and on the per-award pages without any
 * configuration. Each .blog2_item needs:
 *
 *   <div class="display-none" data-map-coords>{{ Location Coordinates }}</div>
 *   <div class="display-none" data-map-location>{{ Location Text }}</div>
 *
 * Filtering is owned by Finsweet CMS Filter — the map subscribes to its
 * renderitems event and mirrors the result, so the region/year/award checkboxes
 * and the keyword search all drive the markers for free. Sorting is hidden in
 * map view, where it means nothing.
 *
 * The popup is a clone of the card the grid already renders, so it inherits
 * the Webflow styling.
 *
 * Demo build: styles are inlined below and MapLibre is loaded from CDN, so the
 * page only needs a single <script> tag. Both move to separate files once the
 * design is settled.
 */
(function () {
    'use strict';

    const MAPLIBRE_VERSION = '5.24.0';
    const MAPLIBRE_JS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
    const MAPLIBRE_CSS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;

    // Pinned to an exact tag rather than the @1 range the other scripts use.
    // jsDelivr caches range resolution for ~12h, so a fresh tag is not picked
    // up immediately — and a stale @1 would 404 here and take the map with it.
    // Bump this and the <script src> together when releasing.
    const STYLE_URL = 'https://cdn.jsdelivr.net/gh/Stichting-Ammodo/ammodo-site-scripts@1.0.8/dist/map-style.json';

    const LIST = '[fs-cmsfilter-element="list"]';
    const ITEM = '.blog2_item';
    const CARD = '.blog2_item-link';
    const TITLE = 'h3';
    const COORDS = '[data-map-coords]';
    const LOCATION = '[data-map-location]';
    const VIEW_BUTTON = '.filters1_view-button';
    const VIEW_BUTTON_LABEL = '.filter-button_text';
    const SORT_WRAPPER = '.sorting-wrapper';
    const IMAGE_WRAPPER = '.blog2_image-wrapper';

    // on the project detail template; the multi-image field cannot be bound
    // inside a Collection List, so the gallery is fetched from there instead
    const GALLERY = '[data-project-gallery]';
    const GALLERY_FALLBACK = '.image-gallery_container';
    const GALLERY_IMAGES = '.w-dyn-items img';

    const MAP_VIEW_CLASS = 'is-map-view';
    const LABEL_SHOW_MAP = 'world view';
    const LABEL_SHOW_LIST = 'list view';
    const HELP_TEXT = 'drag to explore';

    const INITIAL_CENTER = [10, 25];
    const INITIAL_ZOOM = 2;
    const MIN_ZOOM = 2;
    const MAX_ZOOM = 5;
    const MARKER_ZOOM = 3;
    const FIT_PADDING = 80;
    const DESKTOP = '(min-width: 992px)';

    // how far the shuffle button drifts from the project it picks, in metres
    const SHUFFLE_MIN_DISTANCE = 500000;
    const SHUFFLE_MAX_DISTANCE = 1200000;

    // pixels of movement before a gallery pointerdown counts as a drag
    const DRAG_THRESHOLD = 5;
    // how long the carousel takes to settle onto a slide
    const SETTLE_MS = 450;
    // px/ms of release speed that counts as a flick rather than a slow drag
    const FLICK_VELOCITY = 0.4;

    const ICONS = {
        zoomIn: '<svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true"><path fill="#F4F4F4" d="M13.75 16.25h-7.5v-2.5h7.5v-7.5h2.5v7.5h7.5v2.5h-7.5v7.5h-2.5v-7.5Z"/></svg>',
        zoomOut: '<svg viewBox="0 0 30 31" width="30" height="31" aria-hidden="true"><path fill="#F4F4F4" d="M6.25 16.5V14h17.5v2.5H6.25Z"/></svg>',
        shuffle: '<svg viewBox="0 0 30 31" width="30" height="31" aria-hidden="true"><path fill="#F4F4F4" d="M6.375 20.563a10.315 10.315 0 0 1-1.031-2.438A9.62 9.62 0 0 1 5 15.562c0-2.791.969-5.166 2.906-7.124C9.844 6.479 12.208 5.5 15 5.5h.219l-2-2 1.75-1.75 5 5-5 5-1.75-1.75 2-2H15c-2.083 0-3.854.734-5.313 2.203C8.23 11.672 7.5 13.458 7.5 15.563c0 .541.063 1.072.188 1.593.125.521.312 1.032.562 1.532l-1.875 1.875Zm8.656 8.687-5-5 5-5 1.75 1.75-2 2H15c2.083 0 3.854-.734 5.313-2.203 1.458-1.469 2.187-3.255 2.187-5.36 0-.541-.063-1.072-.188-1.593a7.145 7.145 0 0 0-.562-1.531l1.875-1.876c.458.792.802 1.605 1.031 2.438.23.833.344 1.688.344 2.563 0 2.791-.969 5.166-2.906 7.124C20.156 24.521 17.792 25.5 15 25.5h-.219l2 2-1.75 1.75Z"/></svg>',
        chevron: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="m9 5 7 7-7 7"/></svg>',
    };

    /**
     * Plumbing only — positioning, view switching, stacking, and overrides of
     * MapLibre's own stylesheet. Everything cosmetic (colours, sizes,
     * typography, hover transforms, placement offsets) lives in the site's
     * global style block so it can be maintained in Webflow.
     *
     * `display` on the controls and help text is owned here, because it
     * encodes behaviour (zoom buttons and help text are desktop-only) rather
     * than design. Do not also set it in the global block.
     *
     * The font declarations beat MapLibre's .maplibregl-map rule, which would
     * otherwise force Helvetica onto the markers and help text.
     */
    const CSS = `
#ammodo-map{position:fixed;inset:0;z-index:0;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s ease;font-family:inherit;font-weight:inherit}
#ammodo-map .maplibregl-map,#ammodo-map .maplibregl-popup{font-family:inherit;font-weight:inherit}
html.${MAP_VIEW_CLASS} #ammodo-map{opacity:1;visibility:visible;pointer-events:auto}
html.${MAP_VIEW_CLASS} body{overflow:hidden;background:#f1f1f1}
html.${MAP_VIEW_CLASS} .section_results,
html.${MAP_VIEW_CLASS} .section_zero-state-2,
html.${MAP_VIEW_CLASS} .section_header46,
html.${MAP_VIEW_CLASS} ${SORT_WRAPPER},
html.${MAP_VIEW_CLASS} .footer3_component{display:none!important}
html.${MAP_VIEW_CLASS} .page-wrapper{position:relative;z-index:1;background:transparent;pointer-events:none}
html.${MAP_VIEW_CLASS} .navbar4_component,
html.${MAP_VIEW_CLASS} .section_filters{pointer-events:auto;background:transparent}
/* the filter form carries a #f4f4f4 fill that reads as a panel over the map.
   The search input keeps its own fill so typed text stays legible. */
html.${MAP_VIEW_CLASS} .filters_form{background:transparent}
${VIEW_BUTTON}{cursor:pointer}

.ammodo-marker{z-index:10}
.ammodo-marker:hover{z-index:40}
.ammodo-marker.is-active{z-index:30}
.ammodo-marker_inner{will-change:transform}

.ammodo-ui{position:absolute;inset:0;z-index:2;pointer-events:none}
.ammodo-controls{position:absolute;display:flex;flex-direction:column;pointer-events:auto}
.ammodo-control{display:flex;align-items:center;justify-content:center}
.ammodo-control svg{width:100%;height:100%}
.ammodo-control.is-desktop-only{display:none}
.ammodo-help{position:absolute;left:0;right:0;bottom:0;display:none}

.ammodo-popup .maplibregl-popup-content{padding:0;background:transparent;box-shadow:none}
.ammodo-popup .maplibregl-popup-tip{display:none}
.ammodo-popup_card{position:relative}
.ammodo-popup_card a{-webkit-user-drag:none}
.ammodo-gallery_track{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none;cursor:grab}
.ammodo-gallery_track::-webkit-scrollbar{display:none}
.ammodo-gallery_track.is-dragging,.ammodo-gallery_track.is-settling{scroll-snap-type:none}
.ammodo-gallery_track.is-dragging{cursor:grabbing;user-select:none}
.ammodo-gallery_image{flex:0 0 100%;scroll-snap-align:start;display:block;width:100%;height:100%;object-fit:cover;-webkit-user-drag:none;user-select:none}
.ammodo-gallery_nav{position:absolute;left:0;right:0;display:flex;justify-content:space-between;pointer-events:none}
.ammodo-gallery_arrow{pointer-events:auto;display:flex;align-items:center;justify-content:center;border:0;cursor:pointer}
.ammodo-gallery_arrow.is-prev{transform:rotate(180deg)}

@media ${DESKTOP}{
.ammodo-control.is-desktop-only{display:flex}
.ammodo-help{display:block}
}
`;

    let map = null;
    let popup = null;
    let activeProject = null;
    let pendingFilter = null;
    const markers = [];

    const isDesktop = () => window.matchMedia(DESKTOP).matches;

    // --- geo helpers -----------------------------------------------------

    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    /**
     * Great-circle destination point, replacing @turf/destination — the only
     * thing the shuffle button needed turf for.
     */
    const destination = ([lng, lat], metres, bearingDegrees) => {
        const radius = 6371008.8; // mean earth radius, same as turf
        const angular = metres / radius;
        const bearing = (bearingDegrees * Math.PI) / 180;
        const lat1 = (lat * Math.PI) / 180;
        const lng1 = (lng * Math.PI) / 180;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing)
        );
        const lng2 =
            lng1 +
            Math.atan2(
                Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
                Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
            );

        return [((((lng2 * 180) / Math.PI + 540) % 360) - 180), (lat2 * 180) / Math.PI];
    };

    // --- data ------------------------------------------------------------

    /**
     * Parses the comma-separated "Location Coordinates" field into [lng, lat].
     * Tolerates stray whitespace, a swapped lat/lng pair, and trailing extras
     * (one item currently has a stray ",16" appended).
     */
    const parseCoords = (raw, label) => {
        if (!raw) return null;

        const parts = raw.split(',').map((part) => parseFloat(part.trim()));
        if (parts.length > 2) {
            console.warn(`[ammodo-map] "${label}" has ${parts.length} coordinate values, using the first two:`, raw);
        }

        let [lat, lng] = parts;
        if (!isFinite(lat) || !isFinite(lng)) {
            console.warn(`[ammodo-map] "${label}" has unreadable coordinates:`, raw);
            return null;
        }

        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
            [lat, lng] = [lng, lat];
        }
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.warn(`[ammodo-map] "${label}" has out-of-range coordinates:`, raw);
            return null;
        }

        return [lng, lat];
    };

    const readProjects = (list) =>
        Array.from(list.querySelectorAll(ITEM))
            .map((item) => {
                const card = item.querySelector(CARD);
                const title = item.querySelector(TITLE)?.textContent.trim() ?? 'Untitled';
                const lngLat = parseCoords(item.querySelector(COORDS)?.textContent, title);

                if (!card || !lngLat) return null;

                return {
                    item,
                    card,
                    title,
                    lngLat,
                    href: card.getAttribute('href'),
                    locationText: item.querySelector(LOCATION)?.textContent.trim() ?? '',
                };
            })
            .filter(Boolean);

    // --- markers & popup -------------------------------------------------

    /**
     * MapLibre writes its positioning transform onto the element it is handed,
     * so the hover scale lives on an inner wrapper. Scaling the outer element
     * would fight MapLibre for the transform property and lose.
     */
    const createMarkerElement = (project) => {
        const element = document.createElement('div');
        element.className = 'ammodo-marker';

        const inner = document.createElement('div');
        inner.className = 'ammodo-marker_inner';
        element.appendChild(inner);

        const dot = document.createElement('div');
        dot.className = 'ammodo-marker_dot';
        inner.appendChild(dot);

        if (project.locationText) {
            const label = document.createElement('div');
            label.className = 'ammodo-marker_label';
            label.textContent = project.locationText;
            inner.appendChild(label);
        }

        return element;
    };

    // --- gallery ---------------------------------------------------------

    const galleryCache = new Map();

    /**
     * Reads a project's gallery off its detail page. Webflow cannot bind a
     * multi-image field inside a Collection List, so the images are not
     * available on this page at all — and shipping them here would add roughly
     * half a megabyte of markup for a full project set.
     *
     * Cached per href and safe to call speculatively; the marker prefetches on
     * hover so the images are usually ready before the click lands.
     */
    const fetchGallery = (href) => {
        if (!href) return Promise.resolve([]);
        if (galleryCache.has(href)) return galleryCache.get(href);

        const request = fetch(href)
            .then((response) => (response.ok ? response.text() : Promise.reject(new Error(response.status))))
            .then((html) => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const wrapper = doc.querySelector(GALLERY) ?? doc.querySelector(GALLERY_FALLBACK);

                // Webflow omits the container entirely when the multi-image
                // field is empty, so this is a normal state, not an error
                if (!wrapper) return [];

                // querySelector ignores the <script type="text/x-wf-template">
                // Webflow emits alongside the repeater, which holds a duplicate
                // copy of the markup
                return Array.from(wrapper.querySelectorAll(GALLERY_IMAGES))
                    .map((img) => ({
                        src: img.getAttribute('src'),
                        srcset: img.getAttribute('srcset'),
                        sizes: img.getAttribute('sizes'),
                        alt: img.getAttribute('alt') ?? '',
                    }))
                    .filter(({ src }) => src);
            })
            .catch((error) => {
                console.warn(`[ammodo-map] could not load gallery for ${href}`, error);
                return [];
            });

        galleryCache.set(href, request);
        return request;
    };

    /**
     * Eases the track to a slide. Hand-rolled rather than scrollTo({behavior:
     * 'smooth'}), whose duration over a slide's width is short enough to read
     * as a jump. CSS scroll-snap has to stay off for the duration or it fights
     * the animation, hence the is-settling class.
     */
    const settleTo = (track, left) => {
        // added before scrollLeft is read: reading it forces a layout, and if
        // scroll-snap is live at that moment the browser snaps immediately
        track.classList.add('is-settling');

        const from = track.scrollLeft;
        const distance = left - from;

        if (distance === 0) {
            track.classList.remove('is-settling');
            return;
        }

        const start = performance.now();
        const step = (now) => {
            const progress = Math.min(1, (now - start) / SETTLE_MS);
            const eased = 1 - (1 - progress) ** 3; // ease-out cubic
            track.scrollLeft = from + distance * eased;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                track.classList.remove('is-settling');
            }
        };
        requestAnimationFrame(step);
    };

    const slideCount = (track) => track.children.length;

    /**
     * Distance from one slide to the next. The gap between images is set in
     * the style block, so it is read back from the computed style rather than
     * hardcoded — otherwise every slide would drift by the gap width.
     */
    const slideStep = (track) => track.clientWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);

    const settleToIndex = (track, index) => {
        const clamped = Math.max(0, Math.min(index, slideCount(track) - 1));
        settleTo(track, clamped * slideStep(track));
    };

    /**
     * Mouse drag-to-slide. Touch is left alone — the track already scrolls
     * natively there, with momentum this cannot match.
     *
     * Release speed decides the target: a flick carries to the next slide even
     * from a short drag, while a slow drag settles on whichever slide is
     * nearest. Without the velocity check, letting go a pixel past halfway
     * jumps a whole slide, which is what made it feel abrupt.
     *
     * The track sits inside the card's <a>, so a drag that ends in a click
     * would navigate to the project. `dragged` deliberately survives until the
     * next pointerdown so the click handler can suppress it.
     */
    const enableDrag = (track) => {
        let pointerId = null;
        let startX = 0;
        let startScroll = 0;
        let dragged = false;
        let lastX = 0;
        let lastAt = 0;
        let velocity = 0;

        track.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            pointerId = event.pointerId;
            startX = event.clientX;
            startScroll = track.scrollLeft;
            lastX = event.clientX;
            lastAt = performance.now();
            velocity = 0;
            dragged = false;
        });

        track.addEventListener('pointermove', (event) => {
            if (event.pointerId !== pointerId) return;

            const delta = event.clientX - startX;
            if (!dragged) {
                if (Math.abs(delta) < DRAG_THRESHOLD) return;
                dragged = true;
                track.classList.add('is-dragging');
                track.setPointerCapture(pointerId);
            }

            const now = performance.now();
            const elapsed = now - lastAt;
            if (elapsed > 0) {
                velocity = (event.clientX - lastX) / elapsed;
                lastX = event.clientX;
                lastAt = now;
            }

            event.preventDefault();
            track.scrollLeft = startScroll - delta;
        });

        const release = (event) => {
            if (event.pointerId !== pointerId) return;
            if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
            pointerId = null;

            if (!dragged) return;

            // is-settling goes on BEFORE is-dragging comes off, so scroll-snap
            // is never briefly live. Removing it first let the browser snap the
            // instant scrollLeft was read below, which is the "nasty snap" —
            // the animation then had nothing left to travel.
            track.classList.add('is-settling');
            track.classList.remove('is-dragging');

            // a stale reading from a pause before release would misfire the flick
            const idle = performance.now() - lastAt > 100;
            const position = track.scrollLeft / slideStep(track);

            if (!idle && Math.abs(velocity) > FLICK_VELOCITY) {
                // dragging left moves toward the next slide
                settleToIndex(track, velocity < 0 ? Math.ceil(position) : Math.floor(position));
            } else {
                settleToIndex(track, Math.round(position));
            }
        };

        track.addEventListener('pointerup', release);
        track.addEventListener('pointercancel', release);

        track.addEventListener('click', (event) => {
            if (!dragged) return;
            event.preventDefault();
            event.stopPropagation();
        });
    };

    /** Swaps the card's single image for a scroll-snap carousel. */
    const buildGallery = (content, images) => {
        const wrapper = content.querySelector(IMAGE_WRAPPER);
        if (!wrapper || images.length === 0) return;

        const track = document.createElement('div');
        track.className = 'ammodo-gallery_track';

        images.forEach(({ src, srcset, sizes, alt }) => {
            const img = document.createElement('img');
            img.className = 'ammodo-gallery_image';
            img.loading = 'lazy';
            img.src = src;
            if (srcset) img.srcset = srcset;
            if (sizes) img.sizes = sizes;
            img.alt = alt;
            track.appendChild(img);
        });

        wrapper.replaceChildren(track);

        if (images.length < 2) return;

        enableDrag(track);

        // the arrows sit outside the card's <a>, so clicking one cannot
        // navigate to the project
        const nav = document.createElement('div');
        nav.className = 'ammodo-gallery_nav';

        const [previous, next] = [
            ['prev', 'Previous image', -1],
            ['next', 'Next image', 1],
        ].map(([name, label, direction]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `ammodo-gallery_arrow is-${name}`;
            button.setAttribute('aria-label', label);
            button.innerHTML = ICONS.chevron;
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                settleToIndex(track, Math.round(track.scrollLeft / slideStep(track)) + direction);
            });
            nav.appendChild(button);
            return button;
        });

        /**
         * Disables whichever arrow has nowhere to go. Measured off the scroll
         * bounds rather than a slide index so sub-pixel rounding at either end
         * cannot leave an arrow live with no travel left. `disabled` also stops
         * the click natively, so the styling and the behaviour cannot drift.
         */
        const syncArrows = () => {
            previous.disabled = track.scrollLeft <= 1;
            next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
        };

        // covers every way the track can move: arrows, drag, touch, trackpad
        let queued = false;
        track.addEventListener('scroll', () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                queued = false;
                syncArrows();
            });
        });
        syncArrows();

        content.appendChild(nav);
    };

    const buildPopupContent = (project) => {
        const clone = project.card.cloneNode(true);

        // drop the Webflow interaction hooks so IX2 does not bind to the copy,
        // and the hidden filter/coordinate fields we do not want to display
        clone.removeAttribute('data-w-id');
        clone.querySelectorAll('[data-w-id]').forEach((node) => node.removeAttribute('data-w-id'));
        clone.querySelectorAll('.display-none').forEach((node) => node.remove());

        // an <a href> is draggable by default, and dragging anywhere inside it
        // starts a native link drag that cancels the gallery's pointer
        // sequence. dragstart fires on the anchor, above the gallery track, so
        // it has to be suppressed here rather than on the track itself.
        clone.draggable = false;

        const wrapper = document.createElement('div');
        wrapper.className = 'ammodo-popup_card';
        wrapper.addEventListener('dragstart', (event) => event.preventDefault());
        wrapper.appendChild(clone);
        return wrapper;
    };

    const closePopup = () => {
        popup?.remove();
        popup = null;
        activeProject = null;
        markers.forEach(({ element }) => element.classList.remove('is-active'));
    };

    const openProject = (project) => {
        closePopup();
        activeProject = project;
        markers.find((marker) => marker.project === project)?.element.classList.add('is-active');

        const desktop = isDesktop();

        // on mobile the card hangs below the marker, so the marker is pushed
        // above centre to leave room for it. Padding is always passed
        // explicitly — MapLibre keeps it on the map once set, so omitting it
        // would leak this offset into later camera moves.
        map.flyTo({
            center: project.lngLat,
            zoom: MARKER_ZOOM,
            padding: { top: 0, right: 0, left: 0, bottom: desktop ? 0 : map.getContainer().clientHeight / 3 },
        });

        const content = buildPopupContent(project);

        popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: true,
            maxWidth: 'none',
            // no offset, so the card's edge runs through the marker's centre
            anchor: desktop ? 'left' : 'top',
            offset: 0,
            // MapLibre focuses the popup on open, which draws the browser's
            // focus ring around the whole card
            focusAfterOpen: false,
            className: 'ammodo-popup',
        })
            .setLngLat(project.lngLat)
            .setDOMContent(content)
            .addTo(map);

        // the card opens immediately with its main image; the rest of the
        // gallery fills in when the detail page resolves
        fetchGallery(project.href).then((images) => {
            if (activeProject === project) buildGallery(content, images);
        });

        popup.on('close', () => {
            popup = null;
            closePopup();
        });
    };

    // --- controls --------------------------------------------------------

    const visibleProjects = () =>
        markers.filter(({ element }) => element.style.display !== 'none').map(({ project }) => project);

    /** Flies to a random visible project, then drifts a random bearing away. */
    const shuffle = () => {
        const projects = visibleProjects();
        if (projects.length === 0) return;

        const target = projects[randomInt(0, projects.length - 1)];
        const [lng, lat] = destination(
            target.lngLat,
            randomInt(SHUFFLE_MIN_DISTANCE, SHUFFLE_MAX_DISTANCE),
            randomInt(0, 360)
        );
        map.flyTo({ center: [lng, lat] });
    };

    const createControl = (label, icon, onClick, desktopOnly) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `ammodo-control${desktopOnly ? ' is-desktop-only' : ''}`;
        button.setAttribute('aria-label', label);
        button.innerHTML = icon;
        button.addEventListener('click', onClick);
        return button;
    };

    const createUi = (container) => {
        const ui = document.createElement('div');
        ui.className = 'ammodo-ui';

        const controls = document.createElement('div');
        controls.className = 'ammodo-controls';
        controls.append(
            createControl('Zoom in', ICONS.zoomIn, () => map.zoomIn(), true),
            createControl('Zoom out', ICONS.zoomOut, () => map.zoomOut(), true),
            createControl('Fly to a random project', ICONS.shuffle, shuffle, false)
        );

        const help = document.createElement('div');
        help.className = 'ammodo-help';
        help.textContent = HELP_TEXT;

        ui.append(controls, help);
        container.appendChild(ui);
    };

    // --- filtering -------------------------------------------------------

    /**
     * Frames whichever projects are currently showing. Used both on load and
     * after every filter change, so the map always has its markers in view —
     * a fixed centre left two of three off-screen at 1280px wide.
     */
    const frameProjects = (projects, options = {}) => {
        if (projects.length === 0) return;

        if (projects.length === 1) {
            // clears any offset left behind by a popup fly-to
            map.flyTo({ center: projects[0].lngLat, zoom: MARKER_ZOOM, padding: 0, ...options });
            return;
        }

        const lngs = projects.map(({ lngLat }) => lngLat[0]);
        const lats = projects.map(({ lngLat }) => lngLat[1]);
        map.fitBounds(
            [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: FIT_PADDING, maxZoom: MARKER_ZOOM, ...options }
        );
    };

    const applyFilter = (validItems) => {
        if (!map) {
            pendingFilter = validItems; // filtered before the map finished loading
            return;
        }

        const visible = [];
        markers.forEach(({ project, element }) => {
            const show = validItems.has(project.item);
            element.style.display = show ? '' : 'none';
            if (show) visible.push(project);
        });

        if (activeProject && !validItems.has(activeProject.item)) {
            closePopup();
        }

        frameProjects(visible);
    };

    /**
     * Mirrors Finsweet's filtered result onto the markers. Registered
     * independently of map setup so a Finsweet failure leaves an unfiltered but
     * working map rather than no map at all.
     */
    const connectFilter = () => {
        window.fsAttributes = window.fsAttributes || [];
        window.fsAttributes.push([
            'cmsfilter',
            (instances) => {
                const listInstance = instances?.[0]?.listInstance;
                if (!listInstance) {
                    console.warn('[ammodo-map] Finsweet cmsfilter loaded without a list instance');
                    return;
                }

                listInstance.on('renderitems', (renderedItems) => {
                    applyFilter(new Set(renderedItems.map((item) => item.element)));
                });
            },
        ]);
    };

    // --- view toggle -----------------------------------------------------

    const isMapView = () => document.documentElement.classList.contains(MAP_VIEW_CLASS);

    const updateViewLabel = (showMap) => {
        const label = document.querySelector(`${VIEW_BUTTON} ${VIEW_BUTTON_LABEL}`);
        if (label) {
            label.textContent = showMap ? LABEL_SHOW_LIST : LABEL_SHOW_MAP;
        }
    };

    const setMapView = (showMap) => {
        document.documentElement.classList.toggle(MAP_VIEW_CLASS, showMap);
        updateViewLabel(showMap);

        if (showMap) map?.resize();
    };

    /** Restores the normal page when the map cannot be shown. */
    const abort = (message, ...details) => {
        if (message) console.warn(`[ammodo-map] ${message}`, ...details);
        document.documentElement.classList.remove(MAP_VIEW_CLASS);
        updateViewLabel(false);
    };

    // --- setup -----------------------------------------------------------

    const injectCss = () => {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);
    };

    const loadStylesheet = (href) =>
        new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = resolve;
            document.head.appendChild(link);
        });

    const loadScript = (src) =>
        new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`failed to load ${src}`));
            document.head.appendChild(script);
        });

    const init = (projects, style) => {
        const container = document.createElement('div');
        container.id = 'ammodo-map';
        document.body.appendChild(container);

        map = new maplibregl.Map({
            container,
            style,
            center: INITIAL_CENTER,
            zoom: INITIAL_ZOOM,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            attributionControl: false,
        });

        projects.forEach((project) => {
            const element = createMarkerElement(project);
            element.addEventListener('click', (event) => {
                event.stopPropagation();
                openProject(project);
            });
            // warm the gallery so it is usually ready by the time the click lands
            element.addEventListener('mouseenter', () => fetchGallery(project.href), { once: true });

            new maplibregl.Marker({ element, anchor: isDesktop() ? 'center' : 'bottom' })
                .setLngLat(project.lngLat)
                .addTo(map);
            markers.push({ project, element });
        });

        createUi(container);

        // frame the projects once the style is up, without animating on load
        map.once('load', () => frameProjects(projects, { duration: 0 }));

        const button = document.querySelector(VIEW_BUTTON);
        if (button) {
            button.addEventListener('click', () => setMapView(!isMapView()));
        } else {
            console.warn(`[ammodo-map] view toggle "${VIEW_BUTTON}" not found`);
        }

        setMapView(true);

        if (pendingFilter) {
            applyFilter(pendingFilter);
            pendingFilter = null;
        }
    };

    const start = async () => {
        const lists = document.querySelectorAll(LIST);
        if (lists.length === 0) {
            abort(null); // not a projects page
            return;
        }
        if (lists.length > 1) {
            abort(`expected exactly one "${LIST}", found ${lists.length}`);
            return;
        }

        const projects = readProjects(lists[0]);
        if (projects.length === 0) {
            abort('no projects with usable coordinates');
            return;
        }

        updateViewLabel(true);
        connectFilter();

        let style;
        try {
            // fetched rather than handed to MapLibre as a URL, so the response
            // content-type does not matter
            const [styleResponse] = await Promise.all([
                fetch(STYLE_URL),
                loadStylesheet(MAPLIBRE_CSS),
                loadScript(MAPLIBRE_JS),
            ]);
            style = await styleResponse.json();
        } catch (error) {
            abort('failed to load map assets', error);
            return;
        }

        init(projects, style);
    };

    // Hide the grid before the first paint, otherwise it flashes for as long as
    // MapLibre and the basemap take to load. Reverted by abort() if the map
    // cannot be shown, so this must run from the <head>, not before </body>.
    injectCss();
    document.documentElement.classList.add(MAP_VIEW_CLASS);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
