import { Loader } from '@googlemaps/js-api-loader';
import { extractData, PersonData } from "./extractData";
import { PlacesServiceWrapper, PlaceInfo } from './placesServiceWrapper';

const loader = new Loader({
  apiKey: "AIzaSyBfyIEhYmWGE879TOJU8E4Te3fZddx9J-U",
  version: "weekly",
  libraries: ["places"]
});

const DEFAULT_ZOOM_LEVEL = 6;

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
      <style type="text/css">
        #map {
          height: 100%;
        }

        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
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
    currentLocation = { coords: { latitude: 0, longitude: 0 } };
  }

  const map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
    center: {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
    },
    zoom: DEFAULT_ZOOM_LEVEL,
  });

  const geocodingService = new PlacesServiceWrapper(new google.maps.Geocoder());
  const personDataWithCityData = await Promise.all(extractedPersonData.map(async (personData): Promise<PersonData | PersonData & PlaceInfo> => {
    const searchStrings = [
      [personData.city, personData.state, personData.country].filter(v => !!v).join(', '),
      [personData.city, personData.country].filter(v => !!v).join(', '),
      [personData.state, personData.country].filter(v => !!v).join(', '),
      personData.country ?? '',
    ];
    for (let searchString of searchStrings) {
      try {
        const cityData = await geocodingService.findPlace(searchString);
        console.log(`Found info for ${searchString}`);
        return { ...personData, ...cityData[0] };
      } catch(e) {
        console.log(`Did not find info for ${searchString} with error ${e}. Attempting with broader search.`);
      }
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

  Object.values(peopleByPlaceId).forEach((person) => {
    if (person[0].location) {
      const marker = new google.maps.Marker({
        position: person[0].location,
        map,
      });
      const infoWindow = new google.maps.InfoWindow({
        content: `<div><b>${person[0].place_name}</b>` + person.map((data) => `
          <div>
            <b>${data.name}</b>
            <ul>
              ${data.website ? "<li>" + data.website + "</li>" : ''}
              ${data.email ? "<li>" + data.email + "</li>" : ''}
              ${data.phone ? "<li>" + data.phone + "</li>" : ''}
              ${data.facebook ? "<li>" + data.facebook + "</li>" : ''}
              ${data.instagram ? "<li>" + data.instagram + "</li>" : ''}
              ${data.twitter ? "<li>" + data.twitter + "</li>" : ''}
            </ul>
          </div>
        `).join('') + "</div>"
      });
      marker.addListener('click', () => {
        infoWindow.open({
          anchor: marker,
          map,
          shouldFocus: false,
        })
      })
    }
  });
})();
