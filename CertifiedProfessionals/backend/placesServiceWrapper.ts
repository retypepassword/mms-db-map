import { IGeocodingService } from "./geocodingService";
import { storage } from './singletons';

export type PlaceInfo = { place_id: string | undefined; place_name: string | undefined; location: google.maps.LatLngLiteral | undefined };

const DEFAULT_LIMIT_MS = 100;

export class PlacesServiceWrapper {
  private geocodingService: IGeocodingService | null;
  private cache: Record<string, PlaceInfo[] | Promise<PlaceInfo[]>>;

  private requestQueue: Array<() => void>;
  private limitMs: number;
  private timeLastExecutedUnixMs: number;
  private interval?: NodeJS.Timer;

  constructor(geocodingService: IGeocodingService | null, limitMs: number = DEFAULT_LIMIT_MS) {
    this.geocodingService = geocodingService;
    this.cache = {};

    this.requestQueue = [];
    this.limitMs = limitMs;
    this.timeLastExecutedUnixMs = 0;
  }
  
  restoreCache = async (): Promise<void> => {
    const places = await storage.getItem<Record<string, PlaceInfo[]>>('places');
    if (!places) {
      this.cache = {};
      return;
    }

    this.cache = places;
  };
  
  updateCache = async (): Promise<void> => {
    await storage.setItem("places", Object.fromEntries(
      await Promise.all(
        Object.entries(this.cache).map(async ([key, promise]) => {
          try {
            const value = await promise;
            return [key, value];
          } catch {
            return [key, undefined];
          }
        })
      )
    ));
  }

  findPlace = async (search: string): Promise<PlaceInfo[]> => {
    if (this.cache[search]) {
      return this.cache[search];
    }

    try {
      this.cache[search] = this.processInQueue(async () => {
        if (!this.geocodingService) {
          throw "No geocoding service defined";
        }

        const resp = await this.geocodingService.geocode({ address: search })
        return resp.results.map((result) => ({
          place_name: result.formatted_address,
          place_id: result.place_id,
          location: result.geometry?.location
        }));
      });

      // Need to await to allow catch block to work on Promise if necessary
      return await this.cache[search];
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