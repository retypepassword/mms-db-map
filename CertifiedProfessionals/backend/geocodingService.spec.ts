import { Client, GeocodeResponse, Status } from '@googlemaps/google-maps-services-js';
import { GoogleGeocodingService } from './geocodingService';
jest.mock('@googlemaps/google-maps-services-js');

describe('GoogleGeocodingService', () => {
  it("Wraps google-maps-services-js's geocode to have a similar interface as google.maps.Geocoder", async () => {
    const KEY = 'abc';
    const ADDRESS = 'haha';
    const geocodeMock = jest.spyOn(Client.prototype, 'geocode');
    const geocodingService = new GoogleGeocodingService({ key: KEY });
    
    const result = [
      {
        geometry: {
          location: {
            lat: 56,
            lng: 124
          }
        },
        place_id: 'place-id-234',
        formatted_address: 'Florianopolis, SC, Brazil',
      }
    ];
    geocodeMock.mockResolvedValue({
      data: { results: result, status: Status.OK, error_message: '' }
    } as GeocodeResponse)

    const response = await geocodingService.geocode({ address: ADDRESS });
    expect(geocodeMock).toHaveBeenCalledWith({
      params: {
        key: KEY,
        address: ADDRESS 
      }
    });
    expect(response).toEqual(expect.objectContaining({
      results: result
    }))
  })
})