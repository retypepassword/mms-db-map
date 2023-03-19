import { IGeocodingService } from "./geocodingService";
import { PlacesServiceWrapper } from './placesServiceWrapper';
import { CosmosDbStorageService } from './storageService';

jest.mock('./storageService', () => ({
  CosmosDbStorageService: class CosmosDbStorageService {
    getItem() {
      return null;
    }
    setItem() { }
  }
}))

describe('placesServiceWrapper', () => {
  let geocodingService: IGeocodingService;

  const NAME = "Somewhere, USA";
  const PLACE_ID = "ChIJ_YRChQeD44kRYVc8MchM-6c";
  const LAT_LNG = { lat: 42.3479782, lng: -71.2471097 };

  const LIMIT_MS = 5000;
  const makePlacesWrapper = () => new PlacesServiceWrapper(geocodingService, LIMIT_MS);

  const mockReturnValue = {
    place_id: PLACE_ID,
    geometry: {
      location: LAT_LNG,
    },
    formatted_address: NAME,
  }

  beforeEach(() => {
    jest.useRealTimers();

    geocodingService = {
      geocode: jest.fn().mockImplementation((_query, callback) => {
        callback?.(
          [mockReturnValue],
          'OK',
        );
        return Promise.resolve({
          results: [mockReturnValue]
        });
      }),
    };
  });

  it('can be initialized', () => {
    expect(() => { new PlacesServiceWrapper(geocodingService) }).not.toThrow();
  })

  it('has a findPlace method that calls geocode', async () => {
    const QUERY = "Auburndale, MA, United States";
    const placesServiceWrapper = makePlacesWrapper();
    const place = await placesServiceWrapper.findPlace(QUERY);
    expect(place).toEqual([{
      place_name: NAME,
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY },
    );
  });

  it('caches results', async () => {
    const QUERY = "Auburndale, MA, United States";
    const placesServiceWrapper = makePlacesWrapper();
    const place = await placesServiceWrapper.findPlace(QUERY);
    expect(place).toEqual([{
      place_name: NAME,
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY },
    );

    const shouldBeCached = await placesServiceWrapper.findPlace(QUERY);
    expect(shouldBeCached).toEqual([{
      place_name: NAME,
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
  });

  it("doesn't cache promise rejections as valid results", async () => {
    jest.useFakeTimers();
    const QUERY = "Auburndale, MA, United States";
    const geocode = jest.fn();
    const placesServiceWrapper = new PlacesServiceWrapper({ geocode }, LIMIT_MS);

    geocode.mockImplementationOnce((_query, callback) => {
      callback?.(
        null,
        'BAD_REQUEST',
      );
      return Promise.reject("API over limit");
    });
    const place = placesServiceWrapper.findPlace(QUERY);
    jest.advanceTimersByTime(0); // Query runs after timeout of 0, so gotta advance by 0 ms for next tick
    await expect(place).rejects.toBe("API over limit");
    expect(geocode).toHaveBeenCalledTimes(1);
    expect(geocode).toHaveBeenCalledWith(
      { address: QUERY },
    );

    geocode.mockImplementationOnce((_query, callback) => {
      callback?.(
        mockReturnValue,
        'OK',
      );
      return Promise.resolve({
        results: [mockReturnValue]
      });
    });
    const shouldNotBeCached = placesServiceWrapper.findPlace(QUERY);
    jest.advanceTimersByTime(LIMIT_MS);
    await expect(shouldNotBeCached).resolves.toEqual([{
      place_name: NAME,
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    expect(geocode).toHaveBeenCalledTimes(2);
    expect(geocode).toHaveBeenCalledWith(
      { address: QUERY },
    );
  });

  it('rate limits actual calls to google', async () => {
    jest.useFakeTimers();
    const QUERY_1 = "Auburndale, MA, United States";
    const QUERY_2 = "Somerville, MA, United States";
    const QUERY_3 = "Boston, MA, United States";
    const SOME_AMOUNT_OF_TIME_LESS_THAN_LIMIT_MS = LIMIT_MS / 5;

    const placesServiceWrapper = makePlacesWrapper();
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
    );
    jest.advanceTimersByTime(SOME_AMOUNT_OF_TIME_LESS_THAN_LIMIT_MS);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(LIMIT_MS);
    await Promise.resolve(); // Put next expect in microtask https://stackoverflow.com/a/57534747/2484443

    expect(geocodingService.geocode).toHaveBeenCalledTimes(2);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY_2 },
    );
    jest.advanceTimersByTime(SOME_AMOUNT_OF_TIME_LESS_THAN_LIMIT_MS);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(LIMIT_MS);
    await Promise.resolve(); // Put next expect in microtask https://stackoverflow.com/a/57534747/2484443

    expect(geocodingService.geocode).toHaveBeenCalledTimes(3);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY_3 },
    );
  });

  it("doesn't run two intervals at the same time", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(LIMIT_MS);
    const QUERY_1 = "Auburndale, MA, United States";
    const QUERY_2 = "Somerville, MA, United States";
    const QUERY_3 = "Boston, MA, United States";
    const QUERY_4 = "Fortaleza, CE, Brazil";
    const QUERY_5 = "Porto Alegre, RS, Brazil";
    const QUERY_6 = "Sao Paulo, SP, Brazil";
    const QUERY_7 = "Florianopolis, SC, Brazil";

    const placesServiceWrapper = makePlacesWrapper();
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
    jest.advanceTimersByTime(LIMIT_MS);
    jest.setSystemTime(LIMIT_MS * 2)
    await Promise.resolve();
    expect(geocodingService.geocode).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(LIMIT_MS);
    jest.setSystemTime(LIMIT_MS * 3)
    await Promise.resolve();
    expect(geocodingService.geocode).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(LIMIT_MS);
    jest.setSystemTime(LIMIT_MS * 4)
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
    jest.advanceTimersByTime(LIMIT_MS);
    jest.setSystemTime(LIMIT_MS * 5)
    await Promise.resolve();
    expect(geocodingService.geocode).toHaveBeenCalledTimes(5);
    jest.advanceTimersByTime(LIMIT_MS);
    jest.setSystemTime(LIMIT_MS * 6)
    await Promise.resolve();
    expect(geocodingService.geocode).not.toHaveBeenCalledTimes(7);
    expect(geocodingService.geocode).toHaveBeenCalledTimes(6);
  });

  it('uses cache and returns from cache as soon as possible even when hit a bajillion times simultaneously with the same query', async () => {
    const QUERY = "Auburndale, MA, United States";

    const placesServiceWrapper = makePlacesWrapper();
    placesServiceWrapper.findPlace(QUERY);
    placesServiceWrapper.findPlace(QUERY);
    placesServiceWrapper.findPlace(QUERY);
    await expect(placesServiceWrapper.findPlace(QUERY)).resolves.toEqual([{
      place_name: NAME,
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);
    await expect(placesServiceWrapper.findPlace(QUERY)).resolves.toEqual([{
      place_name: NAME,
      place_id: PLACE_ID,
      location: LAT_LNG,
    }]);

    expect(geocodingService.geocode).toHaveBeenCalledTimes(1);
    expect(geocodingService.geocode).toHaveBeenCalledWith(
      { address: QUERY },
    );
  });
  
  it('Restores from cache when restoring from cache called', async () => {
    const getItemSpy = jest.spyOn(CosmosDbStorageService.prototype, 'getItem');
    const placesServiceWrapper = makePlacesWrapper();
    await placesServiceWrapper.restoreCache();
    expect(getItemSpy).toHaveBeenCalled();
    
    getItemSpy.mockResolvedValueOnce([
      'Monrovia, CA',
      'Dublin, CA',
      'Albany, CA'
    ]);
    getItemSpy.mockResolvedValueOnce([{
      place_id: "hahaha",
      place_name: "Monrovia, CA",
      location: undefined
    }]);
    getItemSpy.mockResolvedValueOnce([{
      place_id: "hohoho",
      place_name: "Dublin, CA",
      location: undefined
    }]);
    getItemSpy.mockResolvedValueOnce([{
      place_id: "hehehe",
      place_name: "Albany, CA",
      location: undefined
    }]);
    await placesServiceWrapper.restoreCache();
    
    await expect(placesServiceWrapper.findPlace("Monrovia, CA")).resolves.toEqual([{
      place_id: "hahaha",
      place_name: "Monrovia, CA",
      location: undefined
    }]);
  })
})