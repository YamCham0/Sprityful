export type StoredSpriteRun = {
  id: string;
  name: string;
  prompt: string;
  style: string;
  action: string;
  frames: number;
  image: string;
  createdAt: string;
};

type PersistedRunHistory = {
  accountId: string;
  runs: StoredSpriteRun[];
};

const databaseName = "sprityful-studio";
const storeName = "recent-sprite-sheets";
const databaseVersion = 1;

function isStoredSpriteRun(value: unknown): value is StoredSpriteRun {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<StoredSpriteRun>;
  return typeof run.id === "string"
    && typeof run.name === "string"
    && typeof run.prompt === "string"
    && typeof run.style === "string"
    && typeof run.action === "string"
    && typeof run.frames === "number"
    && Number.isInteger(run.frames)
    && typeof run.image === "string"
    && run.image.startsWith("data:image/")
    && typeof run.createdAt === "string";
}

function openRunHistoryDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "accountId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The browser could not open recent sprite storage."));
  });
}

export async function readStoredSpriteRuns(accountId: string) {
  const database = await openRunHistoryDatabase();

  try {
    return await new Promise<StoredSpriteRun[]>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(accountId);

      request.onsuccess = () => {
        const history = request.result as PersistedRunHistory | undefined;
        resolve(Array.isArray(history?.runs) ? history.runs.filter(isStoredSpriteRun).slice(0, 5) : []);
      };
      request.onerror = () => reject(request.error ?? new Error("The browser could not read recent sprites."));
    });
  } finally {
    database.close();
  }
}

export async function writeStoredSpriteRuns(accountId: string, runs: StoredSpriteRun[]) {
  const database = await openRunHistoryDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put({ accountId, runs: runs.slice(0, 5) } satisfies PersistedRunHistory);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("The browser could not save recent sprites."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The browser could not save recent sprites."));
    });
  } finally {
    database.close();
  }
}

export async function clearStoredSpriteRuns(accountId: string) {
  const database = await openRunHistoryDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(accountId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("The browser could not clear recent sprites."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The browser could not clear recent sprites."));
    });
  } finally {
    database.close();
  }
}
