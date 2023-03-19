import { CosmosDbStorageService, IStorageService } from "./storageService";

export const storage: IStorageService = new CosmosDbStorageService({
  apiUrl: process.env.COSMOS_API_URL,
  apiKey: process.env.COSMOS_API_KEY,
  db: process.env.COSMOS_DB,
  containerName: process.env.COSMOS_CONTAINER,
});
