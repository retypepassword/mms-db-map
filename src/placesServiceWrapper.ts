export type PlaceInfo = { place_id: string | undefined; place_name: string | undefined; location: google.maps.LatLngLiteral | undefined };

const DEFAULT_LIMIT_MS = 1200;

export class PlacesServiceWrapper {
  private geocodingService: google.maps.Geocoder;
  private cache: Record<string, PlaceInfo[] | Promise<PlaceInfo[]>>;

  private requestQueue: Array<() => void>;
  private limitMs: number;
  private timeLastExecutedUnixMs: number;
  private interval?: NodeJS.Timer;

  constructor(geocodingService: google.maps.Geocoder, limitMs: number = DEFAULT_LIMIT_MS) {
    this.geocodingService = geocodingService;
    this.cache = Object.fromEntries(
        (JSON.parse(localStorage.getItem("keys") ?? '[]') as string[]).map((key) =>
        [key, JSON.parse(localStorage.getItem(key) ?? '[]') as PlaceInfo[]]
      )
    );

    this.requestQueue = [];
    this.limitMs = limitMs;
    this.timeLastExecutedUnixMs = 0;
  }

  findPlace = async (search: string): Promise<PlaceInfo[]> => {
    if (this.cache[search]) {
      return this.cache[search];
    }

    this.cache[search] = this.processInQueue(async () => {
      const resp = await this.geocodingService.geocode({ address: search })
      return resp.results.map((result) => ({
        place_name: result.formatted_address,
        place_id: result.place_id,
        location: result.geometry?.location?.toJSON()
      }));
    });

    localStorage.setItem("keys", JSON.stringify([...JSON.parse(localStorage.getItem("keys") ?? '[]'), search]));
    localStorage.setItem(search, JSON.stringify(await this.cache[search]));
    return this.cache[search];
  };

  private processInQueue = <T>(fn: () => Promise<T>) => {
    const fnWrappedInQueuePromise = new Promise<T>((resolve, reject) => {
      const query = () => fn().then(resolve).catch(reject);
      this.requestQueue.push(query);
    });

    if (this.requestQueue.length === 1) {
      this.startProcessingQueue();
    }

    return fnWrappedInQueuePromise;
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