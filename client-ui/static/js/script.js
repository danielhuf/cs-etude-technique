let searchDateRange;
let departureDateRange;

var OnDPairs = [];

document.addEventListener('DOMContentLoaded', function() {
    setupDuration();
    setupSlider([0, 5], 0, 5);
    setupDatePickers();
    setupEventListeners();
    fetchOnDPairs().then(() => {
        setupDefaults();
        fetchFlights(); 
    });
    fetchUsername().then(username => {
        console.log('username:', username);
        setUsername(username);
    });
});

function setUsername(username){
    document.getElementById('username').innerText = username;
}

document.getElementById('origin-city').addEventListener('change', function() {
    updateDestinationsFromOrigin(this.value);
});

document.getElementById('destination-city').addEventListener('change', function() {
    updateOriginsFromDestination(this.value);
});

function setupDuration() {
    const minStayInput = document.getElementById('min-stay');
    const maxStayInput = document.getElementById('max-stay');

    minStayInput.addEventListener('input', function() {
        maxStayInput.min = minStayInput.value; 
        if (parseInt(maxStayInput.value) < parseInt(minStayInput.value)) {
            maxStayInput.value = minStayInput.value; 
        }
        if (parseInt(minStayInput.value) < -1) {
            minStayInput.value = -1;
        }
    });

    maxStayInput.addEventListener('input', function() {
        minStayInput.max = maxStayInput.value; 
        if (parseInt(minStayInput.value) > parseInt(maxStayInput.value)) {
            minStayInput.value = maxStayInput.value;
        }
        if (parseInt(maxStayInput.value) < -1) {
            maxStayInput.value = -1;
        }
    });
}

function setupSlider(startValues, min, max) {
    var sliderElement = document.getElementById('nb-connections-slider');
    noUiSlider.create(sliderElement, {
        start: startValues,
        connect: true,
        range: {
            'min': min,
            'max': max
        },
        step: 1,
        pips: {
            mode: 'values',
            values: [0, 1, 2, 3, 4, 5],
            density: 100
        },
        format: {
            to: function(value) {
                return parseInt(value);
            },
            from: function(value) {
                return parseInt(value);
            }
        }
    });

    sliderElement.noUiSlider.on('update', function(values, handle) {
        sliderElement.dataset.min = values[0];
        sliderElement.dataset.max = values[1];
    });
}

function setupDatePickers() {
    const threeYearsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 3));
    const today = new Date();

    searchDateRange = { start: threeYearsAgo, end: today };
    departureDateRange = { start: threeYearsAgo, end: today };

    searchDateRange.fpInstance = flatpickr("#search-date", {
        mode: "range",
        dateFormat: "Y-m-d",
        maxDate: today,
        defaultDate: [threeYearsAgo, today],
        onChange: function(selectedDates, dateStr, instance) {
            searchDateRange.start = selectedDates[0];
            searchDateRange.end = selectedDates[1];
        }
    });

    departureDateRange.fpInstance = flatpickr("#departure-date", {
        mode: "range",
        dateFormat: "Y-m-d",
        maxDate: today,
        defaultDate: [threeYearsAgo, today],
        onChange: function(selectedDates, dateStr, instance) {
            departureDateRange.start = selectedDates[0];
            departureDateRange.end = selectedDates[1];
        }
    });
}

function setupEventListeners() {
    document.getElementById('search-flights-filter').addEventListener('click', function() {
        fetchFlights();
    });

    document.getElementById('search-flights-nofilter').addEventListener('click', function() {
        fetchFlights(false);
    });

    document.getElementById('trip-type').addEventListener('change', adjustStayDurationBasedOnTripType);
}

function adjustStayDurationBasedOnTripType() {
    const tripType = document.getElementById('trip-type').value;
    const minStayInput = document.getElementById('min-stay');
    const maxStayInput = document.getElementById('max-stay');

    if (tripType === 'OW') {
        minStayInput.value = -1;
        maxStayInput.value = -1;

        minStayInput.disabled = true;
        maxStayInput.disabled = true;
    } else {
        minStayInput.disabled = false;
        maxStayInput.disabled = false;

        minStayInput.value = 0; 
        maxStayInput.value = 7; 
    }
}

function getOriginsFromOnDPairs(OnDPairs) {
    return OnDPairs.map(pair => pair[0]).filter((value, index, self) => self.indexOf(value) === index);
}

function getDestinationsFromOnDPairs(OnDPairs) {
    return OnDPairs.map(pair => pair[1]).filter((value, index, self) => self.indexOf(value) === index);
}

async function fetchOnDPairs() {
    try {
        const currentUrl = window.location.href;
        const modifiedUrl = currentUrl.replace('/dashboard', '/api/ond-pairs');
        const response = await fetch(modifiedUrl);
        const data = await response.json();
        OnDPairs = data['OnDPairs'][0];
        populateDatalist('origin-options', getOriginsFromOnDPairs(OnDPairs));
        populateDatalist('destination-options', getDestinationsFromOnDPairs(OnDPairs));
    } catch (error) {
        console.error('Error fetching city data:', error);
    }
}

function updateDestinationsFromOrigin(origin) {
    // Trim spaces and convert to lowercase for case-insensitive comparison
    origin = origin.trim().toUpperCase();

    if (origin === '') {
        populateDatalist('destination-options', getDestinationFromOnDPairs(OnDPairs));
    } else {
        // Filter destinations whose first characters match the input
        const destinations = OnDPairs.filter(pair => pair[0].toUpperCase() === origin)
                                     .map(pair => pair[1]);
        populateDatalist('destination-options', destinations);
    }
}

function updateOriginsFromDestination(destination) {
    // Trim spaces and convert to lowercase for case-insensitive comparison
    destination = destination.trim().toUpperCase();

    if (destination === '') {
        populateDatalist('origin-options', getOriginsFromOnDPairs(OnDPairs));
    } else {
        // Filter origins whose first characters match the input
        const origins = OnDPairs.filter(pair => pair[1].toUpperCase() === destination)
                                    .map(pair => pair[0]);
        populateDatalist('origin-options', origins);
    }
}


async function fetchUsername(){
    const currentUrl = window.location.href;
    const modifiedUrl = currentUrl.replace('/dashboard', '/api/username');
    return fetch(modifiedUrl)
        .then(response => response.json())
        .then(data => {
            console.log('username:', data);
            if (data) {
                return data.toUpperCase();
            } else {
                return 'User';
            }
        })
        .catch(error => {
            console.error('Error fetching username:', error);
        });
}

function populateDatalist(datalistId, options) {
    const datalist = document.getElementById(datalistId);
    while (datalist.firstChild) {
        datalist.removeChild(datalist.firstChild);
    }
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        datalist.appendChild(optionElement);
    });
}

function setupDefaults() {
    const originInput = document.getElementById('origin-city');
    const destinationInput = document.getElementById('destination-city');
    if (originInput && destinationInput) {
        originInput.value = 'PAR'; 
        destinationInput.value = 'LIS';
    }
}

function fetchFlights(filters=true) {
    document.getElementById('loading').style.display = 'block';

    const originCity = document.getElementById('origin-city').value;
    const destinationCity = document.getElementById('destination-city').value;
    const tripType = document.getElementById('trip-type').value;

    const nbConnectionsSlider = document.getElementById('nb-connections-slider');
    const nbConnectionsMin = nbConnectionsSlider.dataset.min;
    const nbConnectionsMax = nbConnectionsSlider.dataset.max;

    const passengerType = document.getElementById('passenger-type').value;
    const cabin = document.getElementById('cabin').value;

    const minStayInput = document.getElementById('min-stay').value;
    const maxStayInput = document.getElementById('max-stay').value;

    const currentUrl = window.location.href;
    const modifiedUrl = currentUrl.replace('/dashboard', '/api/flights');

    const url = new URL(modifiedUrl);
    url.searchParams.append('filters', filters);
    url.searchParams.append('origin', originCity);
    url.searchParams.append('destination', destinationCity);
    url.searchParams.append('trip_type', tripType);
    url.searchParams.append('nb_connections_min', nbConnectionsMin);
    url.searchParams.append('nb_connections_max', nbConnectionsMax);
    url.searchParams.append('passenger_type', passengerType);
    url.searchParams.append('cabin', cabin);
    url.searchParams.append('min_stay_input', minStayInput);
    url.searchParams.append('max_stay_input', maxStayInput);

    if (searchDateRange.start && searchDateRange.end) {
        url.searchParams.append('search_date_start', formatDateToISO(searchDateRange.start));
        url.searchParams.append('search_date_end', formatDateToISO(searchDateRange.end));
    } else {
        const threeYearsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 3));
        const today = new Date();
        url.searchParams.append('search_date_start', threeYearsAgo.toISOString().split('T')[0]);
        url.searchParams.append('search_date_end', today.toISOString().split('T')[0]);
    }

    if (departureDateRange.start && departureDateRange.end) {
        url.searchParams.append('departure_date_start', formatDateToISO(departureDateRange.start));
        url.searchParams.append('departure_date_end', formatDateToISO(departureDateRange.end));
    } else {
        const threeYearsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 3));
        const today = new Date();
        url.searchParams.append('departure_date_start', threeYearsAgo.toISOString().split('T')[0]);
        url.searchParams.append('departure_date_end', today.toISOString().split('T')[0]);
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                updateDataContainer(data, tripType);
            } else {
                document.getElementById('container').innerHTML = '<p style="text-align: center;">No data available for the selected filters</p>';
            }
            document.getElementById('loading').style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching flights:', error);
            document.getElementById('container').innerHTML = '<p style="text-align: center;">Error loading data. Please try again later.</p>';
            document.getElementById('loading').style.display = 'none';
        });
}

function formatDateToISO(date) {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
        .toISOString()
        .split("T")[0];
}

function updateDataContainer(flightsData, trip_type) {

    const ond = flightsData[0].ond;
    let tripType;

    if (trip_type === 'RT') {
        tripType = 'round trips';
    } else {
        tripType = 'one way';
    }

    const seriesData = flightsData.reduce((acc, flight) => {
        if (!acc[flight.main_airline]) {
            acc[flight.main_airline] = [];
        }
        acc[flight.main_airline].push({
            x: flight.adv_purchase,
            y: flight.median_price
        });
        return acc;
    }, {});

    const chartSeries = Object.keys(seriesData).map(airline => {
        return {
            name: airline,
            data: seriesData[airline].sort((a, b) => a.x - b.x) 
        };
    });

    
    Highcharts.chart('container', {
        chart: {
            type: 'spline'
        },
        title: {
            text: ond + ' ' + tripType
        },
        yAxis: {
            title: {
                text: 'Price (EUR)'
            }
        },
        xAxis: {
            title: {
                text: 'Advance Purchase (days)'
            },
            allowDecimals: false,
            reversed: true
        },
        tooltip: {
            formatter: function() {
                return '<b>' + this.series.name + '</b><br/><b>' + this.y.toFixed(2) + ' €</b>';
            }
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
        },
        plotOptions: {
            series: {
                label: {
                    connectorAllowed: false
                },
                pointStart: 1
            },
            spline: { 
                marker: {
                    enabled: true
                }
            }
        },
        series: chartSeries,
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    legend: {
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom'
                    }
                }
            }]
        }
    });
}
