export class Redis {
  private store = new Map<string, unknown>();

  static fromEnv(): Redis {
    return new Redis();
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null;
  }

  async set(key: string, value: unknown): Promise<"OK"> {
    this.store.set(key, value);
    return "OK";
  }
}
