import { Client } from '@googlemaps/google-maps-services-js';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';
import { extractData, PersonData } from "./extractData";
import { GeocodingService } from './geocodingService';
import { PlacesServiceWrapper, PlaceInfo } from './placesServiceWrapper';

const LISTS = {
  Guide: "https://mmsdb.mmsintadmin.com/lists/cert/Certified%20Guide"
};

export async function run() {
  const response = await fetch(LISTS.Guide);
  const dom = new JSDOM(await response.text());
  const extractedPersonData = extractData(dom.window.document);

  const geocodingService = new PlacesServiceWrapper(new GeocodingService({ key: "AIzaSyBfyIEhYmWGE879TOJU8E4Te3fZddx9J-U" }));
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

  return peopleByPlaceId;
}
