import { Loader } from '@googlemaps/js-api-loader';
import { extractData } from "./extractData";
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

const data = extractData(document);
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

  const placesService = new PlacesServiceWrapper(new google.maps.places.PlacesService(map));
  const dataWithCityData = await Promise.all(data.map(async (personData): Promise<typeof personData | typeof personData & PlaceInfo> => {
    try {
      const cityData = await placesService.findPlace([personData.city, personData.state, personData.country].join(', '));
      console.log(`Found info for ${personData.city}, ${personData.state}, ${personData.country}`);
      return { ...personData, ...cityData[0] };
    } catch(e) {
      console.log(`Did not find info for ${personData.city}, ${personData.state}, ${personData.country} with error ${e}`);
      return personData;
    }
  }));

  dataWithCityData.forEach((v) => {
    if ('location' in v) {
      console.log(`Placing marker for ${v.city}, ${v.state}, ${v.country}`)
      new google.maps.Marker({
        position: v.location,
        map: map
      });
    }
  });
})();
