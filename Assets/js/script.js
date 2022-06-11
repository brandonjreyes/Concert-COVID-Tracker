/*
    First take the search input from user
        Keyword
            Either radius from current location
        or  Input city

    Query from api using input, pull data and render to screen (20 at a time)
        will need some element to toggle pages (basically do the same query but with a different page tag)

    User clicks on a certain event
        Take the venue data from clicked event and grab the zip code
        Use zip code api to find county
        Take that county and then get COVID data using COVID api
            with all this data, render to screen
                Event name
                Venue
                Time starts
                County event is in
                Current cases
                Vaccination rates
*/

const tickmasterURL = 'https://app.ticketmaster.com/discovery/v2/events.json';
const apiKey = `?apikey=cs6ybE2gX1EZMGEsKgTr6gBTb75xbSQf`
const keywordTag = '&keyword=';
const radiusTag = '&radius=';
const unitTag = '&unit=miles';
const postalCodeTag = '&postalCode=';
const cityTag = '&city=';
const latlongTag = '&geoPoint=';
const pageTag = '&page=';
const searchBarEl = $("#searchBar")
const sml = window.matchMedia("(max-width: 500px)")
const sizeTag = '&size=';
const countyNameEl = $('<span>');
const covidDataHeader = $('#covidDataLabel');
const countyStatsEl = $('#countyStats');
const modalEl = $('#covidModal')
const hiddenBtn = $('#hiddenBtn')
const covidAPIKey = `06c6412217b747449f8ef9626323e7a4`;
const rangeSliderEl = $('#range');
const cityInputEl = $('#citySearch');
const keywordInput = $('#eventSearch');
const submitButtonRadiusEl = $('#submitButtonRadius');
const evenDataEl = $('#eventData');
const footerCloseModal = $('#footerCloseModal')
const headerCloseModal = $('#headerCloseModal')
const eventCardsContainer = $(`#eventCards`);

hiddenBtn.attr('data-mdb-toggle', 'modal').attr('data-mdb-target', '#covidModal')

let keyword = "";
let radius = "";
let city = "";
let latlon = "";
let page = 0;
let totalPages;
let queryInput = "";
let queryData = [];



let savedFavorites = {}


function smlScrn(sml) {
    if (sml.matches) {
        console.log("hit");
        $(searchBarEl).removeClass("w-25")
        $(searchBarEl).addClass("w-100");
        eventCardsContainer.removeClass("d-none")
        evenDataEl.addClass("d-none")

    } else {
        $(searchBarEl).addClass("w-25");
        $(searchBarEl).removeClass("w-100")
        eventCardsContainer.removeClass("d-none")
        evenDataEl.addClass("d-none")
    }
}

let covidInfoBtnEl = $('.covid-btn');

const options = {
    method: 'GET'
};

function rangValfunc(val) {
    document.querySelector("#rangeVal").innerHTML = val + " miles";
    radius = val;
};

function nextPage() {   //increment page, requery
    page++;
    if (page === totalPages) {
        page--;
    }
    ticketmasterCall();
}

function previousPage() {   //decrement page, requery
    page--;
    if (page < 0) {
        page = 0;
    }
    ticketmasterCall();
}

function ticketmasterCall() {
    console.log(pageTag + page + queryInput + sizeTag + 15);
    fetch(tickmasterURL + apiKey + pageTag + page + queryInput + sizeTag + 15, options)
        .then(function (response) {
            return response.json()
        })
        .then(function (data) {
            console.log(data);
            totalPages = data.page.totalPages;
            queryData = data._embedded; //returns an array of events, if null then there are no events that fit parameters
            renderResults(queryData);
            renderPagination(data.page);
        });
}

function renderPagination(pageData) {
    let paginationUL = $("#paginationUL");
    paginationUL.empty(paginationUL);
    paginationUL.append($("<div type = 'button'><i class='fa-solid fa-arrow-left'></i> Prev &nbsp;</div>").attr("id", "prevBtn"));
    paginationUL.append($("<div type = 'button'> &nbsp; Next <i class='fa-solid fa-arrow-right'></i></div>").attr("id", "nextBtn"));
    $("#prevBtn").on("click", previousPage);
    $("#nextBtn").on("click", nextPage);
}



function getCounty(zipCode) {   //gets fipsCode from inputted zipcode
    let fipsCode = '';
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Host': 'us-zip-code-lookup.p.rapidapi.com',
            'X-RapidAPI-Key': 'dff04c7643mshdf131b4c950b3bcp1de78bjsnebeba2fbf878'
        }
    };

    fetch(`https://us-zip-code-lookup.p.rapidapi.com/getZip?zip=${zipCode}`, options)
        .then(response => response.json())
        .then(function (data) {
            fipsCode = data.Data[0].StateFIPS + data.Data[0].CountyFIPS;    //makes fips code
            covidAPICall(fipsCode);
        });
}

function covidAPICall(fipsCode) {   //takes fipsCode and gets data
    fetch(`https://api.covidactnow.org/v2/county/${fipsCode}.json?apiKey=${covidAPIKey}`)
        .then(response => response.json())
        .then(function (data) {
            console.log(data);
            renderCovidModal(data);
        });
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(stringifyLocation);
    }
}

function stringifyLocation(position) {
    latlon = position.coords.latitude + "," + position.coords.longitude;
    queryInput = keywordTag + keyword + latlongTag + latlon + radiusTag + radius;
    ticketmasterCall();
}

function search() {
    console.log("searching");
    //search using input from search bar and decide whether city input or radius input is used
    queryInput = "";
    radius = rangeSliderEl.val(); //grab radius from slider
    keyword = keywordInput.val();   //grabs keyword input
    city = cityInputEl.val();
    eventCardsContainer.removeClass('d-none')
    if (city === "" && radius !== '0') {
        //search by radius
        getLocation();
        return;
    }
    else if (radius === '0' && city !== "") {
        queryInput = keywordTag + keyword + cityTag + city;
        ticketmasterCall();
    }
    else if (keyword !== '') {
        queryInput = keywordTag + keyword;
        ticketmasterCall();
    }
    else if (keyword === '' && radius === '0' && city === "") {
        //literally nothing, give error to have user enter input
        displayModalEmptyResults();

    }
}
//render the results to screen using results which is an array of objects
function renderResults(results) {

    console.log();

    let eventTableBody = $('#event-table-body'); // target the event table body so that we can add in new elements.

    eventTableBody.empty(eventTableBody); // clears previous searches

    tableCount = page * 15 + 1;

    if (results !== null) {
        //creates a new row, and fills it with information from event array
        for (let i = 0; i < results.events.length; i++) {
            //populate table
            let tableRow = $("<tr></tr>")
            let rowHeader = $("<th></th>").attr('scope', 'row').text(tableCount + i);
            let favoriteStar = $("<th><button type='button' class='btn btn-floating'><i class='fa-regular fa-star'></i></button></th>")
            let eventURL = $("<a href=''><</a>").text(results.events[i].name).attr("href", results.events[i].url);
            eventURL.attr("target", "_blank");
            let eventName = $("<td></td>").append(eventURL);
            let eventDate = $("<td></td>").text(results.events[i].dates.start.localDate);

            favoriteStar.attr('id', 'favorites')
            favoriteStar.data('eventName', results.events[i].name)
                .data('eventCity', results.events[i]._embedded.venues[0].city.name)
                .data('eventDate', results.events[i].dates.start.localDate)
                .data('eventURL', results.events[i].url)
                .data('eventID', results.events[i].id);
            let zipcode = results.events[i]._embedded.venues[0].postalCode;

            // add covid info button
            let covidInfoBtnCol = $("<td></td>")
            let covidInfoBtn = $("<button></button>")

            covidInfoBtn.addClass("btn btn-sm m-0 btn-warning covid-btn");
            covidInfoBtn.attr('type', "button");
            covidInfoBtn.attr('data-mdb-toggle', "modal")
            covidInfoBtn.attr('data-mdb-target', "#covidModal")
            covidInfoBtn.data('zipcode', zipcode);
            covidInfoBtn.text("COVID INFO");

            covidInfoBtnCol.append(covidInfoBtn);


            eventName.addClass('table-row');
            tableRow.append(rowHeader);
            tableRow.append(favoriteStar);
            tableRow.append(eventName);
            tableRow.append(eventDate);
            tableRow.append(covidInfoBtnCol);
            eventTableBody.append(tableRow);

            //populate cards
            let card = $(`<div>`).addClass(`card`);
            let cardBody = $(`<div>`).addClass(`card-body`);
            let cardTitle = $(`<h5>`);
            let cardTitleA = $(`<a>`).text(results.events[i].name).attr("href", results.events[i].url);
            cardTitle.append(cardTitleA);
            let pDate = $(`<p>`).text(results.events[i].dates.start.localDate);
            let cardBtnContainer = $(`<div>`).css({ 'display': 'flex' });

            let covidBtn2 = $("<button></button>");
            covidBtn2.addClass("btn btn-sm m-0 btn-warning covid-btn");
            covidBtn2.attr('type', "button");
            covidBtn2.attr('data-mdb-toggle', "modal")
            covidBtn2.attr('data-mdb-target', "#covidModal")
            covidBtn2.data('zipcode', zipcode);
            covidBtn2.text("COVID INFO");

            let favoriteStar2 = $("<th><button type='button' class='btn btn-floating'><i class='fa-regular fa-star'></i></button></th>");
            favoriteStar2.attr('id', 'favorites');
            favoriteStar2.data('eventName', results.events[i].name)
                .data('eventCity', results.events[i]._embedded.venues[0].city.name)
                .data('eventDate', results.events[i].dates.start.localDate)
                .data('eventURL', results.events[i].url)
                .data('eventID', results.events[i].id);

            cardBtnContainer.append(covidBtn2, favoriteStar2);
            cardBody.append(cardTitle, pDate, cardBtnContainer);
            card.append(cardBody);
            eventCardsContainer.append(card);
        }
    }
}
function displayModalEmptyResults() {
    hiddenBtn.click()
    covidDataHeader.text("UH OH")
    countyStatsEl.text("Sorry your search resulted in 0 events please expand your search")
    footerCloseModal.on('click', emptyModal)
    headerCloseModal.on('click', emptyModal)
}
function renderCovidModal(data) {
    console.log(252, data);
    if (data) {
        let countyName = data.county;
        countyNameEl.text("Covid Data For: " + countyName);
        covidDataHeader.append(countyNameEl);
        countyStatsUl = $("<ul>")
        let casesMetric = data.metrics.weeklyNewCasesPer100k;   //The number of new cases per 100k population over the last week.
        let casesMetricDesc = 'New cases per 100k population over the last week: ';
        $(countyStatsUl).append("<li>" + casesMetricDesc + casesMetric + "</li>");
        let covidAdmissions = data.metrics.weeklyCovidAdmissionsPer100k; //Number of COVID patients per 100k population admitted in the last week.
        let covidAdmissionsDesc = 'COVID patients per 100k pop admitted in the last week: ';
        $(countyStatsUl).append("<li>" + covidAdmissionsDesc + covidAdmissions + "</li>");
        let population = data.population;   //population of county
        let populationDesc = 'Population of County: '
        $(countyStatsUl).append("<li>" + populationDesc + population + "</li>");
        let vaxRatio = data.metrics.vaccinationsCompletedRatio; //Ratio of population that has completed vaccination.
        let vaxCompleted = vaxRatio * 100;   //Percentage of people that have completed vaccination.
        let vaxCompletedDesc = 'Percentage of people vaccinated fully: ';
        $(countyStatsUl).append("<li>" + vaxCompletedDesc + vaxCompleted + "%" + "</li>");
        countyStatsEl.append(countyStatsUl)
    }
    footerCloseModal.on('click', emptyModal)
    headerCloseModal.on('click', emptyModal)
}

function emptyModal() {
    covidDataHeader.empty()
    countyStatsEl.empty()
}
smlScrn(sml)
sml.addListener(smlScrn)
submitButtonRadiusEl.on('click', search);

function goNewPage(event) {
    event.preventDefault();
    console.log("button clicked");
    location.href = "concertSelect.html";
}

$(document).on('click', '.covid-btn', function () {
    let zipcode = $(this).data('zipcode');
    console.log(zipcode);
    getCounty(zipcode);
});


$(document).on('click', '#favorites', saveFaveFun);
$(document).on('click', '#favorites', saveFaveFun);
$(document).on('click', '#favorites', renderFavorites);

function saveFaveFun() {
    let name = $(this).data('eventName')
    let city = $(this).data('eventCity')
    let date = $(this).data('eventDate')
    let id = $(this).data('eventID')
    let url = $(this).data('eventURL')
    lastInput[id] = [name, city, date, url]
    localStorage.setItem('storedFavorites', JSON.stringify(lastInput));
}

let lastInput = JSON.parse(localStorage.getItem("storedFavorites"));
let faveEl = $("#savedFavorites");

if (lastInput != null) {
    renderFavorites()
} else {
    lastInput = {};
    faveEl.text("Add your favorites!")
}

function renderFavorites() {
    faveEl.empty(faveEl);
    for (let x in lastInput) {
        let listEl = $("<li></li>");
        let listURL = $("<a href=''></a>").text(lastInput[x][0]).attr("href", lastInput[x][3]).attr("target", "_blank")
        listEl.append(listURL)
        faveEl.append(listEl);
    }
}

$("#clearBtn").on("click", clearFavorites)

function clearFavorites() {
    faveEl.empty(faveEl);
    lastInput = {}
    faveEl.text("Add your favorites!")
    localStorage.setItem('storedFavorites', JSON.stringify(lastInput));
}

