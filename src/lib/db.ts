import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'MuscleAppDB';
const STORE_NAME = 'exercise_images';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

export const saveImage = async (id: string, blob: Blob): Promise<void> => {
  const db = await getDB();
  await db.put(STORE_NAME, blob, id);
};

export const getImage = async (id: string): Promise<Blob | undefined> => {
  const db = await getDB();
  return db.get(STORE_NAME, id);
};

export const getAllImages = async (): Promise<{ id: string, blob: Blob }[]> => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const keys = await store.getAllKeys();
  const values = await store.getAll();
  return keys.map((key, i) => ({ id: key as string, blob: values[i] as Blob }));
};

export const getAllImageIds = async (): Promise<string[]> => {
  const db = await getDB();
  return db.getAllKeys(STORE_NAME) as Promise<string[]>;
};

export const deleteImage = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
};
