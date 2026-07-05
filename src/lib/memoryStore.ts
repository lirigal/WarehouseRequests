const sessionCache: Record<string, string> = {};

export const memoryStore = {
  getItem: (key: string): string | null => {
    return sessionCache[key] || null;
  },
  setItem: (key: string, value: string): void => {
    sessionCache[key] = value;
  },
  removeItem: (key: string): void => {
    delete sessionCache[key];
  },
  clear: (): void => {
    for (const key in sessionCache) {
      delete sessionCache[key];
    }
  }
};
