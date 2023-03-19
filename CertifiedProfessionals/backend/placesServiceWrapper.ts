import { IGeocodingService } from "./geocodingService";
import { storage } from './singletons';

export type PlaceInfo = { place_id: string | undefined; place_name: string | undefined; location: google.maps.LatLngLiteral | undefined };

const DEFAULT_LIMIT_MS = 20;

export class PlacesServiceWrapper {
  private geocodingService: IGeocodingService;
  private cache: Record<string, PlaceInfo[] | Promise<PlaceInfo[]>>;

  private requestQueue: Array<() => void>;
  private limitMs: number;
  private timeLastExecutedUnixMs: number;
  private interval?: NodeJS.Timer;

  constructor(geocodingService: IGeocodingService, limitMs: number = DEFAULT_LIMIT_MS) {
    this.geocodingService = geocodingService;
    this.cache = {};

    this.requestQueue = [];
    this.limitMs = limitMs;
    this.timeLastExecutedUnixMs = 0;
  }
  
  restoreCache = async (): Promise<void> => {
    const keys = await storage.getItem<string[]>('keys');
    const places = keys?.map(async (key) => {
      const item = await storage.getItem<PlaceInfo[]>(key);
      return [key, item ?? []];
    })
    if (!places) {
      this.cache = {};
      return;
    }

    this.cache = Object.fromEntries(await Promise.all(places));
  };

  findPlace = async (search: string): Promise<PlaceInfo[]> => {
    if (this.cache[search]) {
      return this.cache[search];
    }

    try {
      this.cache[search] = this.processInQueue(async () => {
        const resp = await this.geocodingService.geocode({ address: search })
        return resp.results.map((result) => ({
          place_name: result.formatted_address,
          place_id: result.place_id,
          location: result.geometry?.location
        }));
      });

      const keys = await storage.getItem<string[]>("keys") ?? []
      storage.setItem("keys", [...keys, search]);
      storage.setItem(search, await this.cache[search]);
      return this.cache[search];
    } catch(e) {
      delete this.cache[search];
      throw e;
    }
  };

  private processInQueue = <T>(fn: () => Promise<T>): Promise<T> => {
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