import { Loader } from '@googlemaps/js-api-loader';
import { extractData } from "./extractData";

const loader = new Loader({
  apiKey: "",
  version: "weekly",
  libraries: ["places"]
});

(async () => {
  const google = await loader.load();
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
  `)
  new google.maps.Map(document.getElementById("map") as HTMLElement)
})();
