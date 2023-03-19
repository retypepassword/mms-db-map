import { Client, GeocodeResponse, GeocodeResult, Status } from '@googlemaps/google-maps-services-js';
import { htmlOnePersonPerCity as mockHtmlOnePersonPerCity } from './extractDataTestData.testHelper';
import { run } from '.';

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({
    text: jest.fn().mockResolvedValue(mockHtmlOnePersonPerCity)
  })
}));

const result1 = [
  {
    geometry: {
      location: {
        lat: 45,
        lng: 123
      }
    },
    place_id: 'place-id-123',
    formatted_address: 'Fortaleza, CE, Brazil',
  } as unknown as GeocodeResult
];

const result2 = [
  {
    geometry: {
      location: {
        lat: 56,
        lng: 124
      }
    },
    place_id: 'place-id-234',
    formatted_address: 'Florianopolis, SC, Brazil',
  } as unknown as GeocodeResult
];

describe('index', () => {
  beforeEach(() => {
    (global as any).localStorage = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
    };
    
    jest.spyOn(Client.prototype, 'geocode')
      .mockResolvedValueOnce({
        data: { results: result1, status: Status.OK, error_message: '' }
      } as GeocodeResponse)
      .mockResolvedValueOnce({
        data: { results: result2, status: Status.OK, error_message: '' }
      } as GeocodeResponse);
  });

  it('Should fetch data from some site, turn it into jsdom, and call extract data on it', async () => {
    await expect(run()).resolves.toEqual({
      'place-id-123': [
        {
          "place_id": "place-id-123",
          "place_name": "Fortaleza, CE, Brazil",
          "location": {
            lat: 45,
            lng: 123
          },
          "city": "Fortaleza",
          "country": "Brazil",
          "email": "juniormms.br@gmail.com",
          "instagram": "http://www.instagram.com/juniormmsbr",
          "name": "Francisco Ferreira de Oliveira Junior",
          "phone": "(85)99998-9967",
          "state": "CE",
          "website": "http://juniormms.com.br",
        }
      ],
      'place-id-234': [
        {
          "place_id": "place-id-234",
          "place_name": "Florianopolis, SC, Brazil",
          "location": {
            lat: 56,
            lng: 124
          },
          "city": "Florianopolis",
          "country": "Brazil",
          "email": "liza@escolamodernademisterios.com.br",
          "name": "Liza de Brito Rossi",
          "phone": "+55 48 99163-4824",
          "state": "SC",
          "website": "http://brasilmms.com",          
        }
      ]
    });
  });
});