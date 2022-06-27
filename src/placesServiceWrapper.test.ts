import { initialize as initializeMockGoogleMaps, mockInstances } from "@googlemaps/jest-mocks";
import { PlacesServiceWrapper } from './placesServiceWrapper';

describe('placesServiceWrapper', () => {
  let placesService: google.maps.places.PlacesService;

  const PLACE_ID = "ChIJ_YRChQeD44kRYVc8MchM-6c";
  const LAT_LNG = { lat: 42.3479782, lng: -71.2471097 };

  beforeEach(() => {
    initializeMockGoogleMaps();
    (global as any).google.maps.places.PlacesServiceStatus = {
      INVALID_REQUEST: 'INVALID_REQUEST',
      NOT_FOUND: 'NOT_FOUND',
      OK: 'OK',
      OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
      REQUEST_DENIED: 'REQUEST_DENIED',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR',
      ZERO_RESULTS: 'ZERO_RESULTS',
    };

    placesService = {
      findPlaceFromPhoneNumber: jest.fn(),
      findPlaceFromQuery: jest.fn().mockImplementation((_query, callback) => callback(
        [
          {
            place_id: PLACE_ID,
            geometry: {
              location: {
                toJSON: jest.fn().mockReturnValue(LAT_LNG),
              }
            }
          }
        ],
        google.maps.places.PlacesServiceStatus.OK,
      )),
      getDetails: jest.fn(),
      nearbySearch: jest.fn(),
      textSearch: jest.fn(),
    };
  });

  it('can be initialized', () => {
    expect(() => { new PlacesServiceWrapper(placesService) }).not.toThrow();
  })

  it('has a findPlace method that calls findPlaceFromQuery', async () => {
    const QUERY = "Auburndale, MA, United States";
    const placesServiceWrapper = new PlacesServiceWrapper(placesService);
    const place = await placesServiceWrapper.findPlace(QUERY);
    expect(place).toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(1);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledWith(
      { query: QUERY, fields: ['name', 'geometry', 'place_id'] },
      expect.any(Function),
    );
  });

  it('caches results', async () => {
    const QUERY = "Auburndale, MA, United States";
    const placesServiceWrapper = new PlacesServiceWrapper(placesService);
    const place = await placesServiceWrapper.findPlace(QUERY);
    expect(place).toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(1);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledWith(
      { query: QUERY, fields: ['name', 'geometry', 'place_id'] },
      expect.any(Function),
    );

    const shouldBeCached = await placesServiceWrapper.findPlace(QUERY);
    expect(shouldBeCached).toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(1);
  });

  it('rate limits actual calls to google', async () => {
    jest.useFakeTimers();
    const QUERY_1 = "Auburndale, MA, United States";
    const QUERY_2 = "Somerville, MA, United States";
    const QUERY_3 = "Boston, MA, United States";

    const placesServiceWrapper = new PlacesServiceWrapper(placesService);
    placesServiceWrapper.findPlace(QUERY_1);
    jest.advanceTimersByTime(0); // Query runs after timeout of 0, so gotta advance by 0 ms for next tick
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_2);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_3);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(1);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledWith(
      { query: QUERY_1, fields: ['name', 'geometry', 'place_id'] },
      expect.any(Function),
    );
    jest.advanceTimersByTime(1000);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    await Promise.resolve(); // Put next expect in microtask https://stackoverflow.com/a/57534747/2484443

    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(2);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledWith(
      { query: QUERY_2, fields: ['name', 'geometry', 'place_id'] },
      expect.any(Function),
    );
    jest.advanceTimersByTime(1000);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(5000);
    await Promise.resolve(); // Put next expect in microtask https://stackoverflow.com/a/57534747/2484443

    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(3);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledWith(
      { query: QUERY_3, fields: ['name', 'geometry', 'place_id'] },
      expect.any(Function),
    );

    jest.useRealTimers();
  });

  it('uses cache and returns from cache as soon as possible even when hit a bajillion times simultaneously with the same query', async () => {
    const QUERY = "Auburndale, MA, United States";

    const placesServiceWrapper = new PlacesServiceWrapper(placesService);
    placesServiceWrapper.findPlace(QUERY);
    placesServiceWrapper.findPlace(QUERY);
    placesServiceWrapper.findPlace(QUERY);
    await expect(placesServiceWrapper.findPlace(QUERY)).resolves.toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    await expect(placesServiceWrapper.findPlace(QUERY)).resolves.toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);

    expect(placesService.findPlaceFromQuery).toHaveBeenCalledTimes(1);
    expect(placesService.findPlaceFromQuery).toHaveBeenCalledWith(
      { query: QUERY, fields: ['name', 'geometry', 'place_id'] },
      expect.any(Function),
    );
  });
})