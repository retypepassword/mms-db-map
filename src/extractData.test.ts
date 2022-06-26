import { JSDOM } from 'jsdom';
import { extractData } from './extractData';
import { htmlOnePersonPerCity, htmlMultiplePeoplePerCity, htmlAllContactInfo } from './extractDataTestData.testHelper';

describe('extractData', () => {
  it("gets name, city, state, country correctly when there's only one city per state and one person per city", () => {
    const dom = new JSDOM(htmlOnePersonPerCity);
    const result = extractData(dom.window.document);
    expect(result).toEqual([
      expect.objectContaining({
        name: 'Francisco Ferreira de Oliveira Junior',
        city: 'Fortaleza',
        state: 'CE',
        country: 'Brazil'
      }),
      expect.objectContaining({
        name: 'Liza de Brito Rossi',
        city: 'Florianopolis',
        state: 'SC',
        country: 'Brazil'
      })
    ]);
  });

  it("gets other data correctly when all fields present", () => {
    const dom = new JSDOM(htmlAllContactInfo);
    const result = extractData(dom.window.document);
    expect(result).toEqual([
      {
        name: 'Carla Senft',
        city: 'Thornhill',
        state: 'ON',
        country: 'Canada',
        email: 'c.senft@me.com',
        phone: '6472375483',
        website: 'http://www.carlasenft.com',
        facebook: 'https://www.facebook.com/Carla Senft',
        twitter: 'https://www.twitter.com/@CarlaSenft',
        instagram: 'https://www.instagram.com/carla.senft',
      }
    ]);
  });

  it("gets other data correctly when some fields present", () => {
    const dom = new JSDOM(htmlOnePersonPerCity);
    const result = extractData(dom.window.document);
    expect(result).toEqual([
      {
        name: 'Francisco Ferreira de Oliveira Junior',
        city: 'Fortaleza',
        state: 'CE',
        country: 'Brazil',
        website: 'http://juniormms.com.br',
        email: 'juniormms.br@gmail.com',
        phone: '(85)99998-9967',
        instagram: 'http://www.instagram.com/juniormmsbr'
      },
      {
        name: 'Liza de Brito Rossi',
        city: 'Florianopolis',
        state: 'SC',
        country: 'Brazil',
        website: 'http://brasilmms.com',
        email: 'liza@escolamodernademisterios.com.br',
        phone: '+55 48 99163-4824'
      }
    ]);
  });


  it("gets name, city, state, country correctly when there's multiple cities per state and 1+ people per city", () => {
    const dom = new JSDOM(htmlMultiplePeoplePerCity);
    const result = extractData(dom.window.document);
    expect(result).toEqual([
      expect.objectContaining({
        name: 'Thalya Alves Aragão',
        city: '',
        state: 'DF',
        country: 'Brazil'
      }),
      expect.objectContaining({
        name: 'Dalila Coelho da Silveira',
        city: 'Brasilia',
        state: 'DF',
        country: 'Brazil'
      }),
      expect.objectContaining({
        name: 'Glauco Nunes de Pinho',
        city: 'Brasilia',
        state: 'DF',
        country: 'Brazil'
      }),
      expect.objectContaining({
        name: 'Sônia Aiko Takata',
        city: 'Brasília',
        state: 'DF',
        country: 'Brazil'
      })
    ]);
  });

});
