export type PlaceInfo = { place_id: string | undefined; location: google.maps.LatLngLiteral | undefined };

const DEFAULT_LIMIT_MS = 5000;

export class PlacesServiceWrapper {
  private placesService: google.maps.places.PlacesService;
  private cache: Record<string, PlaceInfo[] | Promise<PlaceInfo[]>>;

  private requestQueue: Array<() => void>;
  private limitMs: number;
  private timeLastExecutedUnixMs: number;
  private interval?: NodeJS.Timer;

  constructor(placesService: google.maps.places.PlacesService, limitMs: number = DEFAULT_LIMIT_MS) {
    this.placesService = placesService;
    this.cache = {};

    this.requestQueue = [];
    this.limitMs = limitMs;
    this.timeLastExecutedUnixMs = 0;
  }

  findPlace = async (search: string): Promise<PlaceInfo[]> => {
    if (this.cache[search]) {
      return this.cache[search];
    }

    this.cache[search] = new Promise((resolve, reject) => {
      const query = () => {
        this.placesService.findPlaceFromQuery({ query: search, fields: ['name', 'geometry', 'place_id'] }, (rawResults, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            const results = rawResults?.map((result) => ({ 
              place_id: result.place_id,
              location: result.geometry?.location?.toJSON()
            })) ?? [];
            return resolve(results);
          }
          reject(status);
        });
      };
      this.addToQueue(query);
    });
    return this.cache[search];
  };

  private addToQueue = (fn: () => void) => {
    this.requestQueue.push(fn);

    if (this.requestQueue.length === 1) {
      this.startProcessingQueue();
    }
  }

  private startProcessingQueue = () => {
    const millisecondsSinceLastRun = Date.now() - this.timeLastExecutedUnixMs;
    const nextWaitTime =
      millisecondsSinceLastRun > this.limitMs
        ? 0
        : this.limitMs - millisecondsSinceLastRun;

    const executeNextItemAndClearIntervalIfQueueEmpty = () => {
      this.timeLastExecutedUnixMs = Date.now();
      this.requestQueue.shift()?.();
      if (this.requestQueue.length === 0) {
        clearInterval(this.interval);
      }
    };

    setTimeout(() => {
      this.interval = setInterval(executeNextItemAndClearIntervalIfQueueEmpty, this.limitMs);
      executeNextItemAndClearIntervalIfQueueEmpty();
    }, nextWaitTime);
  }
}