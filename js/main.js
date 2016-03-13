

//function to instantiate the Leaflet map
function createMap(){
    var southWest = L.latLng(15, 64),
    northEast = L.latLng(54, 140),
    bounds = L.latLngBounds(southWest, northEast);
    //create the map
    L.mapbox.accessToken = 'pk.eyJ1IjoiaGxpdTI1NSIsImEiOiJjaWZ5ZXhpbWQ0emFldjhseTN1eWFubHc5In0.UzL23IhYg5k9Isl3NBdIpg';
    var map = L.mapbox.map('map', 'mapbox.dark',{
        maxBounds: bounds,
        maxZoom: 6,
        minZoom: 4
    });
    
    map.setView([32, 113], 5);

    //call getData function
    getData(map);
};

//Step 2: Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/gdp.geojson", {
        dataType: "json",
        success: function(response){
            //create an attributes array
            var years = processData(response);
            //call function to create proportional symbols
            createPropSymbols(response, map, years);
            //call function to create sequence control
            createSequenceControls(map, years);
            setFilter(map, 2000);
            createLegend(map, years);
        }
    });
};


//
function processData(data){
    //empty array to hold attributes
    var years = [];
    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    //push each attribute name into attributes array
    for (var year in properties){
        //only take attributes with population values
        if (year.indexOf("20") > -1){
            years.push(year);
        };
    };

    return years;
};

//Step 3: Add circle markers for point features to the map
//Add circle markers for point features to the map
var featureLayer = null;//mapbox featureLayer to add geojson
function createPropSymbols(data, map, years){
    //create a Leaflet GeoJSON layer and add it to the map
    // L.geoJson(data, {
    //     pointToLayer: function(feature, latlng) {
    //         map.featureLayer = pointToLayer(feature, latlng, years);
    //         return pointToLayer(feature, latlng, years);
    //     }
    // }).addTo(map);
    featureLayer = L.mapbox.featureLayer(data, {
        pointToLayer: function(feature, latlng) {
            return pointToLayer(feature, latlng, years);
    }
    }).addTo(map);
};


//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 0.4;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI) + 3;

    return radius;
};

function createPopup(properties, year, layer, radius){
    var popupContent = "<p><b>province:</b> " + properties.province + "</p>";
    popupContent += "<p><b>GDP of " + year + ":</b> " + properties[year] + "</p>";
    layer.bindPopup(popupContent, {
        offset: new L.point(0,-radius)
    });
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, years){
    //Determine which attribute to visualize with proportional symbols
    var year = years[0];

    //create marker options
    var options = {
        fillColor: "white",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[year]);
    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    createPopup(feature.properties, year.toString(), layer, options.radius);
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};


//functions to enable sequence control
//Step 1: Create new sequence controls
function createSequenceControls(map, years){
    //create range input element (slider)
    var sliderControl = L.control();//add slider as a control, like zoom and attribution
    sliderControl.onAdd = function(map){
        var slider = L.DomUtil.create("input", "range-slider");// tag should be input for input control
        L.DomEvent.addListener(slider, 'mousedown', function(e){
            L.DomEvent.stopPropagation(e);
        });

        $(slider).attr({
            type:'range',
            max: 9,
            min: 0,
            value: 0,
            step: 1
        });

        $(slider).on('input', function(){
            //removeFilter();//reset filter menu, make all features show up when changing time
            setFilter(map, years[$(this).val()]);
            updatePropSymbols(map, years[$(this).val()]);
            $(".slider-label").text(years[this.value]);
        });
        //slider is actually designed as an input tag
        //year of different position of the slider is the output tag
        return slider;
    };
    sliderControl.addTo(map);
    createSliderLabel(map, years[0]);
};

//update symbols based on given year 
function updatePropSymbols(map, year){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[year]){
            var props = layer.feature.properties;
            var radius = calcPropRadius(props[year]);
            layer.setRadius(radius);
            createPopup(props, year, layer, radius);

        };
    });
};

//use an output class to label the slider
function createSliderLabel(map, year){
    var sliderLabelControl = L.control();
    sliderLabelControl.onAdd = function(map){
        var output = L.DomUtil.create("output", "slider-label");
        $(output).text(year);
        return output;
    };
    sliderLabelControl.addTo(map);
};

// filter
function setFilter(map, year){
    var all = document.getElementById('filter-all');
    var good = document.getElementById('filter-good');
    var bad = document.getElementById('filter-bad');

    all.onclick = function(){
        good.className = '';
        bad.className = '';
        this.className = 'active';
        //this takes each obj in the feature layer, true to show up, false  to hide
        featureLayer.setFilter(function(feature){
            return true;
        });
        //filter only works for the featureLayer when it is just defined, with no
        //symbol update, so need to update again after filter 
        updatePropSymbols(map, year);
        return false;
    };

    good.onclick = function(e){
        all.className = '';
        bad.className = '';
        this.className = 'active';
        featureLayer.setFilter(function(feature){
            if (feature.properties[year] < 900) {
                return true;
            };
        });
        updatePropSymbols(map, year);
        return false;
    };

    bad.onclick = function(e){
        all.className = '';
        good.className = '';
        this.className = 'active';
        featureLayer.setFilter(function(feature){
            if (feature.properties[year] > 2000) {
                return true;
            };
        });
        updatePropSymbols(map, year);
        return false;
    };
//trigger(simulated) click on the currently activated filter
    if (all.className == 'active') {
        $(all).trigger('click');
    };
    if (good.className == 'active') {
        $(good).trigger('click');
    };
    if (bad.className == 'active') {
        $(bad).trigger('click');
    };
};

//fifth interaction operator, filter
function removeFilter(){
    var all = document.getElementById('filter-all');
    var good = document.getElementById('filter-good');
    var bad = document.getElementById('filter-bad');
//reset the filter menu
    all.className = 'active';
    good.className = '';
    bad.className = '';

    featureLayer.setFilter(function(){return true;});

};

function createLegend(map, years){
    var legendControl = L.control({position:"bottomleft"});
    legendControl.onAdd = function(map){
        var container = L.DomUtil.create('div', 'legend-control-container');
        //add temporal legend div to container
        $(container).append('<div id="legend-title">')
        //Step 1: start attribute legend svg string
        var svg = '<svg id="attribute-legend" width="210px" height="200px">';
        var circles = {
            max: 40,
            mean: 90,
            min: 130
        };
        for (var circle in circles){
            svg += '<circle class="legend-circle" id="' + circle + 
            '" fill="lightgray" fill-opacity="0.8" stroke="#000000" cx="110"/>';

            svg += '<text id="' + circle + '-text" x="100" y="' + circles[circle] + '"></text>';
        };

        svg += "</svg>";
        //add attribute legend svg to container
        $(container).append(svg);

        return container;
    };

    legendControl.addTo(map);


    var content = " GDP in 亿元(15 million US Dollar)";
    //replace legend content
    $('#legend-title').html(content);
    var circleValues = {
        max: 30000,
        mean: 10000,
        min: 200
    };

    for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //Step 3: assign the cy and r attributes
        $('#'+key).attr({
            cy: 150 - radius,
            r: radius
        });

        $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100);
    };

};

//fifth interaction operator, filter
function removeFilter(){
    var all = document.getElementById('filter-all');
    var good = document.getElementById('filter-good');
    var bad = document.getElementById('filter-bad');
//reset the filter menu
    all.className = 'active';
    good.className = '';
    bad.className = '';

    featureLayer.setFilter(function(){return true;});

};


$(document).ready(createMap);