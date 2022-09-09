import { Loader } from '@googlemaps/js-api-loader';
import { extractData, PersonData } from "./extractData";
import { PlacesServiceWrapper, PlaceInfo } from './placesServiceWrapper';

const loader = new Loader({
  apiKey: "AIzaSyBfyIEhYmWGE879TOJU8E4Te3fZddx9J-U",
  version: "weekly",
  libraries: ["places"]
});

const DEFAULT_ZOOM_LEVEL = 6;
const DEFAULT_MAX_ZOOM_LEVEL = 10;

const getCurrentLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    }
  });
};

const extractedPersonData = extractData(document);
document.write(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Certified Professionals</title>
      <link href="/assets/css/app.css" rel="stylesheet" type="text/css">
      <style type="text/css">
        #map {
          height: 100%;
        }

        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }

        .person-name, .place-name {
          font-size: 16px;
          font-weight: 400;
        }

        .place-name {
          margin-bottom: 10px;
          font-weight: bold;
        }

        .info-list {
          list-style-type: none;
          padding: 0 0 0 4px;
          font-weight: 400;
        }

        .info-list a {
          color: #566295 !important;
          font-size: 12px;
          line-height: 14px;
          padding: 0px;
          margin: 0px;
        }

        .info-list a span {
          margin-right: 2px;
        }

        .not-available {
          color: gray;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
    </body>
  </html>
`);

(async () => {
  const google = await loader.load();
  let currentLocation;
  try {
    currentLocation = await getCurrentLocation();
  } catch (e) {
    // consider using https://dev.maxmind.com/geoip/geolite2-free-geolocation-data city data as a backup
    currentLocation = { coords: { latitude: 43.620495, longitude: -79.513199 } };
  }

  const map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
    center: {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
    },
    zoom: DEFAULT_ZOOM_LEVEL,
    maxZoom: DEFAULT_MAX_ZOOM_LEVEL,
  });

  const geocodingService = new PlacesServiceWrapper(new google.maps.Geocoder());
  const personDataWithCityData = await Promise.all(extractedPersonData.map(async (personData): Promise<PersonData | PersonData & PlaceInfo> => {
    const searchStrings = [
      [personData.city, personData.state, personData.country].filter(v => !!v).join(', '),
      [personData.city, personData.country].filter(v => !!v).join(', '),
      [personData.state, personData.country].filter(v => !!v).join(', '),
      personData.country ?? '',
    ];
    const RETRY_TIMES = 3;
    for (let searchString of searchStrings) {
      for (let i = 0; i < RETRY_TIMES; i++) {
        try {
          const cityData = await geocodingService.findPlace(searchString);
          console.log(`Found info for ${searchString}`);
          return { ...personData, ...cityData[0] };
        } catch(e) {
          console.log(`Did not find info for ${searchString} with error ${e}. Retrying ${RETRY_TIMES - i} more times.`);
        }
      }
      console.log(`Did not find info for ${searchString}. Retrying with broader search`)
    }
    return personData;
  }));

  const peopleByPlaceId = personDataWithCityData.reduce((uniqueCities, currentPerson) => {
    const placeId = 'location' in currentPerson && currentPerson.place_id ? currentPerson.place_id : 'other';
    return {
      ...uniqueCities,
      [placeId]: [
        ...(uniqueCities[placeId] ?? []),
        currentPerson
      ]
    };
  }, {} as { [index: string]: Array<PersonData & Partial<PlaceInfo>> });

  let openInfoWindow: google.maps.InfoWindow | null = null;

  Object.values(peopleByPlaceId).forEach((person) => {
    if (person[0].location) {
      const marker = new google.maps.Marker({
        position: person[0].location,
        map,
      });
      const infoWindow = new google.maps.InfoWindow({
        content: `<div><div class="place-name">${person[0].place_name}</div>` + person.map((data) => `
          <div>
            <span class="person-name">${data.name}</span>
            <ul class="info-list">
              ${data.website ? `<li><a href="${data.website}" target="_blank">` + data.website + "</a></li>" : ''}
              ${data.email ? `<li><a href="mailto:${data.email}"><span class="fa fa-fw fa-envelope"></span>` + data.email + "</a></li>" : ''}
              ${data.phone ? `<li><a href="tel:${data.phone}"><span class="fa fa-fw fa-phone-square"></span>` + data.phone + "</a></li>" : ''}
              ${data.facebook ? `<li><a href="${data.facebook}"><span class="fa fa-fw fa-facebook-square"></span>` + data.facebook + "</a></li>" : ''}
              ${data.twitter ? `<li><a href="${data.twitter}"><span class="fa fa-fw fa-twitter-square"></span>` + data.twitter + "</a></li>" : ''}
              ${data.instagram ? `<li><a href="${data.instagram}"><span class="fa fa-fw fa-instagram"></span>` + data.instagram + "</a></li>" : ''}
              ${!data.website && !data.email && !data.phone && !data.facebook && !data.twitter && !data.instagram ? '<li><span class="not-available">No contact information available</span></li>' : ''}
            </ul>
          </div>
        `).join('') + "</div>"
      });
      marker.addListener('click', () => {
        openInfoWindow?.close();
        openInfoWindow = infoWindow;
        infoWindow.open({
          anchor: marker,
          map,
          shouldFocus: false,
        });
      })
    }
  });

  google.maps.event.addListener(map, 'click', () => {
    openInfoWindow?.close();
    openInfoWindow = null;
  });
})();
