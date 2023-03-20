import { Container, CosmosClient, ItemDefinition, Resource } from "@azure/cosmos";

export interface IStorageService {
  getItem<T>(id: string): Promise<T | undefined>;
  setItem<T>(id: string, value: T): Promise<void>;
}

export class CosmosDbStorageService implements IStorageService {
  private cosmosClient: CosmosClient | null;
  private container: Container | null;

  constructor({ apiUrl, apiKey, db, containerName }: {
    apiUrl?: string,
    apiKey?: string,
    db?: string;
    containerName?: string;
  }) {
    this.cosmosClient = apiUrl && apiKey ? new CosmosClient({ endpoint: apiUrl, key: apiKey }) : null;
    this.container = this.cosmosClient && db && containerName ? this.cosmosClient.database(db).container(containerName) : null;
  }

  async getItem<T>(id: string) {
    const response = await this.container?.item(id, id).read<{ value: T }>();
    return response?.resource?.value;
  };

  async setItem<T>(id: string, value: T) {
    await this.container?.items.upsert<{ id: string, value: T }>({ id, value })
  };
}