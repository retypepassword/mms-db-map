import { Client } from '@googlemaps/google-maps-services-js';

export interface IGeocodingService {
  geocode: (args: { address: string }) => Promise<{
    results: Array<{
      formatted_address: string;
      place_id: string;
      geometry: {
        location: {
          lat: number;
          lng: number;
        }
      }
    }>
  }>;
};

export class GoogleGeocodingService implements IGeocodingService {
  private key: string;
  private client: Client

  constructor({ key }: { key: string }) {
    this.key = key
    this.client = new Client({})
  }

  geocode = async ({ address }: { address: string }) => {
    const response = await this.client.geocode({
      params: {
        key: this.key,
        address
      }
    });
    return response.data;
  }
}