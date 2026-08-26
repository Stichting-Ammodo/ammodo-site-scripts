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

    // raw.githubusercontent serves fresh on every push (jsDelivr caches mutable
    // refs for up to 7 days). Swap for a pinned jsDelivr tag before go-live.
    const STYLE_URL =
        'https://raw.githubusercontent.com/Stichting-Ammodo/ammodo-site-scripts/main/dist/map-style.json';

    const LIST = '[fs-cmsfilter-element="list"]';
    const ITEM = '.blog2_item';
    const CARD = '.blog2_item-link';
    const TITLE = 'h3';
    const COORDS = '[data-map-coords]';
    const LOCATION = '[data-map-location]';
    const VIEW_BUTTON = '.filters1_view-button';
    const VIEW_BUTTON_LABEL = '.filter-button_text';

    const MAP_VIEW_CLASS = 'is-map-view';
    const LABEL_SHOW_MAP = 'world view';
    const LABEL_SHOW_LIST = 'list view';

    const INITIAL_CENTER = [10, 25];
    const INITIAL_ZOOM = 2;
    const MIN_ZOOM = 2;
    const MAX_ZOOM = 5;
    const MARKER_ZOOM = 3;
    const DESKTOP = '(min-width: 992px)';

    const CSS = `
#ammodo-map{position:fixed;inset:0;z-index:0;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s ease}
html.${MAP_VIEW_CLASS} #ammodo-map{opacity:1;visibility:visible;pointer-events:auto}
html.${MAP_VIEW_CLASS} body{overflow:hidden}
html.${MAP_VIEW_CLASS} .section_results,
html.${MAP_VIEW_CLASS} .section_zero-state-2,
html.${MAP_VIEW_CLASS} .section_header46,
html.${MAP_VIEW_CLASS} .footer3_component{display:none!important}
html.${MAP_VIEW_CLASS} .page-wrapper{position:relative;z-index:1;background:transparent;pointer-events:none}
html.${MAP_VIEW_CLASS} .navbar4_component,
html.${MAP_VIEW_CLASS} .section_filters{pointer-events:auto;background:transparent}
${VIEW_BUTTON}{cursor:pointer}

.ammodo-marker{position:relative;display:flex;align-items:center;cursor:pointer;transition:transform .3s ease-out;will-change:transform}
.ammodo-marker:hover,.ammodo-marker.is-active{transform:scale(1.5)}
.ammodo-marker_dot{width:24px;height:24px;border-radius:50%;background:#adadad;transition:background-color .2s ease}
.ammodo-marker:hover .ammodo-marker_dot,.ammodo-marker.is-active .ammodo-marker_dot{background:#3ecc45}
.ammodo-marker_label{position:absolute;left:30px;white-space:nowrap;font-size:11px;line-height:1;opacity:0;transition:opacity .2s ease}
.ammodo-marker:hover .ammodo-marker_label{opacity:1}

.ammodo-popup .maplibregl-popup-content{padding:0;background:transparent;box-shadow:none}
.ammodo-popup .maplibregl-popup-tip{display:none}
.ammodo-popup_card{width:360px;max-width:80vw;background:#fff}
.ammodo-popup_card a{display:block;color:inherit;text-decoration:none}
`;

    let map = null;
    let popup = null;
    const markers = [];

    const isDesktop = () => window.matchMedia(DESKTOP).matches;

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
                    card,
                    title,
                    lngLat,
                    locationText: item.querySelector(LOCATION)?.textContent.trim() ?? '',
                };
            })
            .filter(Boolean);

    // --- rendering -------------------------------------------------------

    const createMarkerElement = (project) => {
        const element = document.createElement('div');
        element.className = 'ammodo-marker';

        const dot = document.createElement('div');
        dot.className = 'ammodo-marker_dot';
        element.appendChild(dot);

        if (project.locationText) {
            const label = document.createElement('div');
            label.className = 'ammodo-marker_label';
            label.textContent = project.locationText;
            element.appendChild(label);
        }

        return element;
    };

    const buildPopupContent = (project) => {
        const clone = project.card.cloneNode(true);

        // drop the Webflow interaction hooks so IX2 does not bind to the copy,
        // and the hidden filter/coordinate fields we do not want to display
        clone.removeAttribute('data-w-id');
        clone.querySelectorAll('[data-w-id]').forEach((node) => node.removeAttribute('data-w-id'));
        clone.querySelectorAll('.display-none').forEach((node) => node.remove());

        const wrapper = document.createElement('div');
        wrapper.className = 'ammodo-popup_card';
        wrapper.appendChild(clone);
        return wrapper;
    };

    const clearActive = () => {
        markers.forEach(({ element }) => element.classList.remove('is-active'));
    };

    const openProject = (project) => {
        clearActive();
        markers.find((marker) => marker.project === project)?.element.classList.add('is-active');

        map.flyTo({ center: project.lngLat, zoom: MARKER_ZOOM });

        popup?.remove();
        popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: true,
            maxWidth: 'none',
            anchor: isDesktop() ? 'left' : 'bottom',
            offset: 20,
            className: 'ammodo-popup',
        })
            .setLngLat(project.lngLat)
            .setDOMContent(buildPopupContent(project))
            .addTo(map);

        popup.on('close', clearActive);
    };

    // --- view toggle -----------------------------------------------------

    const isMapView = () => document.documentElement.classList.contains(MAP_VIEW_CLASS);

    const setMapView = (showMap) => {
        document.documentElement.classList.toggle(MAP_VIEW_CLASS, showMap);

        const label = document.querySelector(`${VIEW_BUTTON} ${VIEW_BUTTON_LABEL}`);
        if (label) {
            label.textContent = showMap ? LABEL_SHOW_LIST : LABEL_SHOW_MAP;
        }

        if (showMap) map?.resize();
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

            new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(project.lngLat).addTo(map);
            markers.push({ project, element });
        });

        const button = document.querySelector(VIEW_BUTTON);
        if (button) {
            button.addEventListener('click', () => setMapView(!isMapView()));
        } else {
            console.warn(`[ammodo-map] view toggle "${VIEW_BUTTON}" not found`);
        }

        setMapView(true);
    };

    const start = async () => {
        const lists = document.querySelectorAll(LIST);
        if (lists.length === 0) return; // not a projects page
        if (lists.length > 1) {
            console.error(`[ammodo-map] expected exactly one "${LIST}", found ${lists.length} — aborting`);
            return;
        }

        const projects = readProjects(lists[0]);
        if (projects.length === 0) {
            console.warn('[ammodo-map] no projects with usable coordinates');
            return;
        }

        injectCss();

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
            console.error('[ammodo-map] failed to load map assets', error);
            return;
        }

        init(projects, style);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
