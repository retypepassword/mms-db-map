describe('CosmosDbStorageService', () => {
  const CONFIG = { 
    apiUrl: 'https://example.documents.azure.com:443/',
    apiKey: 'niceTryButThisIsNotReal==',
    db: 'certified-professionals-db',
    containerName: 'certified-professionals-container'
  };
  
  beforeEach(() => {
    jest.resetModules();
  })

  it('Should use the existing cosmos client', async () => {
    const cosmosClientMock = jest.fn().mockReturnValue({
      database: jest.fn().mockReturnValue({
        container: jest.fn()
      })
    })
    jest.doMock('@azure/cosmos', () => ({
      CosmosClient: cosmosClientMock
    }))
    const { CosmosDbStorageService } = require('./storageService');
    const cosmosStorageService = new CosmosDbStorageService(CONFIG);
    expect(cosmosClientMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: CONFIG.apiUrl,
      key: CONFIG.apiKey
    }));
  });
  
  it('Should use the appropriate container', async () => {
    const actualCosmos = jest.requireActual('@azure/cosmos');
    jest.doMock('@azure/cosmos', () => ({
      ...actualCosmos,
    }));
    const dbSpy = jest.spyOn(actualCosmos.CosmosClient.prototype, 'database');
    const contSpy = jest.spyOn(actualCosmos.Database.prototype, 'container');
    const { CosmosDbStorageService } = require('./storageService');
    const cosmosStorageService = new CosmosDbStorageService(CONFIG);
    expect(dbSpy).toHaveBeenCalledWith(CONFIG.db);
    expect(contSpy).toHaveBeenCalledWith(CONFIG.containerName);
  });
  
  it('Has a getItem and setItem methods', () => {
    const { CosmosDbStorageService } = require('./storageService');
    const cosmosStorageService = new CosmosDbStorageService(CONFIG);
    expect(cosmosStorageService).toHaveProperty('getItem');
    expect(cosmosStorageService).toHaveProperty('setItem');
    expect(cosmosStorageService.getItem).toEqual(expect.any(Function));
    expect(cosmosStorageService.setItem).toEqual(expect.any(Function));
  });
});