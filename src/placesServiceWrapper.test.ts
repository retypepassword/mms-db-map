import { initialize as initializeMockGoogleMaps, mockInstances } from "@googlemaps/jest-mocks";
import { PlacesServiceWrapper } from './placesServiceWrapper';

describe('placesServiceWrapper', () => {
  let geocodingService: google.maps.Geocoder;

  const PLACE_ID = "ChIJ_YRChQeD44kRYVc8MchM-6c";
  const LAT_LNG = { lat: 42.3479782, lng: -71.2471097 };

  beforeEach(() => {
    jest.useRealTimers();

    initializeMockGoogleMaps();
    geocodingService = {
      geocode: jest.fn().mockImplementation((_query, callback) => callback(
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
        'OK',
      )),
    };
  });

  it('can be initialized', () => {
    expect(() => { new PlacesServiceWrapper(geocodingService) }).not.toThrow();
  })

  it('has a findPlace method that calls geocode', async () => {
    const QUERY = "Auburndale, MA, United States";
    const placesServiceWrapper = new PlacesServiceWrapper(geocodingService);
    const place = await placesServiceWrapper.findPlace(QUERY);
    expect(place).toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY },
      expect.any(Function),
    );
  });

  it('caches results', async () => {
    const QUERY = "Auburndale, MA, United States";
    const placesServiceWrapper = new PlacesServiceWrapper(geocodingService);
    const place = await placesServiceWrapper.findPlace(QUERY);
    expect(place).toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY },
      expect.any(Function),
    );

    const shouldBeCached = await placesServiceWrapper.findPlace(QUERY);
    expect(shouldBeCached).toEqual([{
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
  });

  it('rate limits actual calls to google', async () => {
    jest.useFakeTimers();
    const QUERY_1 = "Auburndale, MA, United States";
    const QUERY_2 = "Somerville, MA, United States";
    const QUERY_3 = "Boston, MA, United States";

    const placesServiceWrapper = new PlacesServiceWrapper(geocodingService);
    placesServiceWrapper.findPlace(QUERY_1);
    jest.advanceTimersByTime(0); // Query runs after timeout of 0, so gotta advance by 0 ms for next tick
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_2);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_3);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY_1 },
      expect.any(Function),
    );
    jest.advanceTimersByTime(1000);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    await Promise.resolve(); // Put next expect in microtask https://stackoverflow.com/a/57534747/2484443

    expect(geocodingService.geocode).toHaveBeenCalledTimes(2);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY_2 },
      expect.any(Function),
    );
    jest.advanceTimersByTime(1000);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(5000);
    await Promise.resolve(); // Put next expect in microtask https://stackoverflow.com/a/57534747/2484443

    expect(geocodingService.geocode).toHaveBeenCalledTimes(3);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY_3 },
      expect.any(Function),
    );
  });

  it("doesn't run two intervals at the same time", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(5000);
    const QUERY_1 = "Auburndale, MA, United States";
    const QUERY_2 = "Somerville, MA, United States";
    const QUERY_3 = "Boston, MA, United States";
    const QUERY_4 = "Fortaleza, CE, Brazil";
    const QUERY_5 = "Porto Alegre, RS, Brazil";
    const QUERY_6 = "Sao Paulo, SP, Brazil";
    const QUERY_7 = "Florianopolis, SC, Brazil";

    const placesServiceWrapper = new PlacesServiceWrapper(geocodingService);
    placesServiceWrapper.findPlace(QUERY_1);
    jest.advanceTimersByTime(0); // Query runs after timeout of 0, so gotta advance by 0 ms for next tick
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_2);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_3);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    jest.setSystemTime(10000)
    await Promise.resolve();
    expect(geocodingService.geocode).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(5000);
    jest.setSystemTime(15000)
    await Promise.resolve();
    expect(geocodingService.geocode).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(5000);
    jest.setSystemTime(20000)
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_4);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_5);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_6);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    placesServiceWrapper.findPlace(QUERY_7);
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    expect(geocodingService.geocode).not.toHaveBeenCalledTimes(3);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(4);
    jest.advanceTimersByTime(5000);
    jest.setSystemTime(25000)
    await Promise.resolve();
    expect(geocodingService.geocode).toHaveBeenCalledTimes(5);
    jest.advanceTimersByTime(5000);
    jest.setSystemTime(35000)
    await Promise.resolve();
    expect(geocodingService.geocode).not.toHaveBeenCalledTimes(7);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(6);
  });

  it('uses cache and returns from cache as soon as possible even when hit a bajillion times simultaneously with the same query', async () => {
    const QUERY = "Auburndale, MA, United States";

    const placesServiceWrapper = new PlacesServiceWrapper(geocodingService);
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

    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY },
      expect.any(Function),
    );
  });
})