'use strict';

// Map and year-range configuration
var MAP_CONFIG = {
    accessToken: 'pk.eyJ1Ijoic2xrb3Nvdm8iLCJhIjoiY2tuc3YwNjNuMTJnNDJ1cXdhazVydDZ2cSJ9.QEeEU3pdlV2hBg245jVTJg',
    center: [20.45710490014006, 42.59902581127422],
    zoom: 12,
    style: 'mapbox://styles/mapbox/outdoors-v11',
    geojsonPath: './deforestation/merged_slk.geojson'
};

// Year range configuration
var MIN_YEAR = 2001;
var MAX_YEAR = 2024;

mapboxgl.accessToken = MAP_CONFIG.accessToken;
var map = new mapboxgl.Map({
    container: 'map',
    style: MAP_CONFIG.style,
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

// disable map rotation using right click + drag
map.dragRotate.disable();

// disable map rotation using touch rotation gesture
map.touchZoomRotate.disableRotation();

// Get CSS custom property value
function getCSSColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Get color for a specific year (reads from CSS variables)
function getYearColor(year) {
    var color = getCSSColor('--color-' + year);
    return color || getCSSColor('--color-default');
}

// Generate CSS gradient string from CSS variables
function generateGradientCSS() {
    var range = MAX_YEAR - MIN_YEAR;
    var stops = [];
    var year;

    for (year = MIN_YEAR; year <= MAX_YEAR; year++) {
        var percent = ((year - MIN_YEAR) / range) * 100;
        stops.push(getYearColor(year) + ' ' + percent.toFixed(2) + '%');
    }

    return 'linear-gradient(to right, ' + stops.join(', ') + ')';
}

// Apply gradient to slider element (call when slider element exists)
function applySliderGradient(sliderElement) {
    var gradient = generateGradientCSS();
    sliderElement.style.background = gradient;
    var noUiBase = sliderElement.querySelector('.noUi-base');
    if (noUiBase) {
        noUiBase.style.background = gradient;
    }
}

// Create color expression for Mapbox
function createColorExpression() {
    var cases = [];
    var year;

    for (year = MIN_YEAR; year <= MAX_YEAR; year++) {
        cases.push(['==', ['number', ['get', 'year']], year]);
        cases.push(getYearColor(year));
    }
    cases.push(getCSSColor('--color-default'));

    return ['case'].concat(cases);
}

var sliderOptions = {
    elm: 'slider-control',
    layer: 'forest_layer',
    source: 'forest_source',
    controlWidth: 'min(400px, calc(100vw - 40px))',
    minProperty: 'year',
    maxProperty: 'year',
    sliderMin: MIN_YEAR,
    sliderMax: MAX_YEAR,
    filterMin: MIN_YEAR,
    filterMax: MAX_YEAR,
    propertyType: 'integer',
    rangeDescriptionFormat: 'integer',
    descriptionPrefix: 'Year:'
};

map.addControl(new RangeSlider(sliderOptions, 'bottom-left'));

// Add year labels under the slider (call when slider element exists)
function addSliderYearLabels(sliderElement) {
    var labelsDiv = document.createElement('div');
    labelsDiv.className = 'slider-year-labels';
    labelsDiv.innerHTML = '<span>' + MIN_YEAR + '</span><span>' + MAX_YEAR + '</span>';
    sliderElement.parentNode.insertBefore(labelsDiv, sliderElement.nextSibling);
}

// Run callback when slider DOM exists and noUiSlider is initialized
function whenSliderFullyReady(callback) {
    function check() {
        var el = document.getElementById('slider-control');
        if (el && el.noUiSlider) {
            callback(el);
            return;
        }
        requestAnimationFrame(check);
    }
    requestAnimationFrame(check);
}

// Add overlays to dim colors outside selected range (call when noUiSlider exists)
function setupSliderOverlays(sliderElement) {
    var leftOverlay = document.createElement('div');
    leftOverlay.className = 'slider-overlay slider-overlay-left';
    var rightOverlay = document.createElement('div');
    rightOverlay.className = 'slider-overlay slider-overlay-right';

    var noUiBase = sliderElement.querySelector('.noUi-base');
    noUiBase.appendChild(leftOverlay);
    noUiBase.appendChild(rightOverlay);

    function updateOverlays() {
        var values = sliderElement.noUiSlider.get();
        var minVal = parseFloat(values[0]);
        var maxVal = parseFloat(values[1]);
        var range = MAX_YEAR - MIN_YEAR;
        var leftPercent = ((minVal - MIN_YEAR) / range) * 100;
        var rightPercent = ((MAX_YEAR - maxVal) / range) * 100;

        leftOverlay.style.width = leftPercent + '%';
        rightOverlay.style.width = rightPercent + '%';
    }

    updateOverlays();
    sliderElement.noUiSlider.on('update', updateOverlays);
}

function initSliderCustomizations() {
    whenSliderFullyReady(function (sliderElement) {
        applySliderGradient(sliderElement);
        addSliderYearLabels(sliderElement);
        setupSliderOverlays(sliderElement);
    });
}

map.on('load', function () {
    map.addSource('forest_source', {
        type: 'geojson',
        data: MAP_CONFIG.geojsonPath
    });

    map.addLayer({
        id: 'forest_layer',
        source: 'forest_source',
        type: 'fill',
        paint: {
            'fill-color': createColorExpression(),
            'fill-opacity': 1
        }
    });

    initSliderCustomizations();
});
