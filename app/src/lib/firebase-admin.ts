import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const hasCredentials = 
  !!process.env.FIREBASE_PROJECT_ID && 
  !!process.env.FIREBASE_CLIENT_EMAIL && 
  !!process.env.FIREBASE_PRIVATE_KEY;

// Initialize Firebase Admin if credentials exist
if (hasCredentials && getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('❌ Failed to initialize real Firebase Admin SDK:', error);
  }
}

// ─── Local JSON DB Fallback implementation ───────────────────────────────────

const LOCAL_DB_PATH = path.join(process.cwd(), 'stash_local_db.json');

function readDbFile(): Record<string, Record<string, any>> {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

function writeDbFile(data: Record<string, Record<string, any>>) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Local DB Write Error:', error);
  }
}

class LocalDocRef {
  private col: string;
  private docId: string;

  constructor(col: string, docId: string) {
    this.col = col;
    this.docId = docId;
  }

  get id() {
    return this.docId;
  }

  async get() {
    const data = readDbFile();
    const doc = data[this.col]?.[this.docId];
    return {
      id: this.docId,
      exists: !!doc,
      data: () => (doc ? JSON.parse(JSON.stringify(doc)) : undefined),
    };
  }

  async set(value: any, options?: { merge?: boolean }) {
    const data = readDbFile();
    if (!data[this.col]) data[this.col] = {};
    
    if (options?.merge && data[this.col][this.docId]) {
      data[this.col][this.docId] = {
        ...data[this.col][this.docId],
        ...value,
      };
    } else {
      data[this.col][this.docId] = value;
    }
    writeDbFile(data);
  }

  async update(value: any) {
    const data = readDbFile();
    if (!data[this.col]?.[this.docId]) {
      throw new Error(`Document ${this.col}/${this.docId} not found to update`);
    }
    data[this.col][this.docId] = {
      ...data[this.col][this.docId],
      ...value,
    };
    writeDbFile(data);
  }

  async delete() {
    const data = readDbFile();
    if (data[this.col]?.[this.docId]) {
      delete data[this.col][this.docId];
      writeDbFile(data);
    }
  }
}

class LocalQuery {
  private col: string;
  private filters: Array<{ field: string; op: string; value: any }> = [];
  private sorts: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
  private limitCount?: number;

  constructor(col: string) {
    this.col = col;
  }

  where(field: string, op: string, value: any) {
    this.filters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.sorts.push({ field, direction });
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  async get() {
    const data = readDbFile();
    const collection = data[this.col] || {};
    let docs = Object.entries(collection).map(([id, doc]: [string, any]) => ({
      id,
      exists: true,
      ref: new LocalDocRef(this.col, id),
      data: () => JSON.parse(JSON.stringify(doc)),
    }));

    // Apply filters
    for (const filter of this.filters) {
      docs = docs.filter((doc) => {
        const val = doc.data()[filter.field];
        if (filter.op === '==') return val === filter.value;
        if (filter.op === '!=') return val !== filter.value;
        if (filter.op === '>') return val > filter.value;
        if (filter.op === '>=') return val >= filter.value;
        if (filter.op === '<') return val < filter.value;
        if (filter.op === '<=') return val <= filter.value;
        if (filter.op === 'array-contains') return Array.isArray(val) && val.includes(filter.value);
        return true;
      });
    }

    // Apply sorts
    for (const sort of this.sorts) {
      docs.sort((a, b) => {
        const valA = a.data()[sort.field];
        const valB = b.data()[sort.field];
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== undefined) {
      docs = docs.slice(0, this.limitCount);
    }

    return {
      docs,
      empty: docs.length === 0,
      forEach(cb: (doc: any) => void) {
        docs.forEach(cb);
      },
    };
  }
}

class LocalFirestore {
  collection(name: string) {
    return {
      doc: (id?: string) => {
        const docId = id || Math.random().toString(36).substring(2, 15);
        return new LocalDocRef(name, docId);
      },
      add: async (value: any) => {
        const docId = Math.random().toString(36).substring(2, 15);
        const ref = new LocalDocRef(name, docId);
        await ref.set(value);
        return ref;
      },
      where: (field: string, op: string, value: any) => {
        return new LocalQuery(name).where(field, op, value);
      },
      orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => {
        return new LocalQuery(name).orderBy(field, direction);
      },
      limit: (n: number) => {
        return new LocalQuery(name).limit(n);
      },
      get: async () => {
        return new LocalQuery(name).get();
      },
    };
  }

  async runTransaction(cb: (transaction: any) => Promise<any>) {
    const transaction = {
      get: async (docRef: any) => docRef.get(),
      set: (docRef: any, data: any) => docRef.set(data),
      update: (docRef: any, data: any) => docRef.update(data),
      delete: (docRef: any) => docRef.delete(),
    };
    return cb(transaction);
  }
}

// ─── Export wrapper objects ──────────────────────────────────────────────────

let dbInstance: any;
let authAdminInstance: any;

if (hasCredentials && getApps().length > 0) {
  dbInstance = getFirestore();
  authAdminInstance = getAuth();
} else {
  if (!isProduction) {
    console.warn('⚠️  [STASH] Firebase credentials not found in env. Initializing local JSON Database fallback.');
  }
  dbInstance = new LocalFirestore();
  authAdminInstance = {
    verifyIdToken: async (idToken: string) => {
      // Mock Sandbox tokens
      if (idToken.startsWith('sandbox_') || idToken === 'sandbox_google_user' || idToken === 'sandbox_microsoft_user') {
        const provider = idToken.includes('google') ? 'google' : 'microsoft';
        return {
          uid: `${provider}-sandbox-uid`,
          email: `${provider}-sandbox@stash.app`,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Stasher`,
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${provider}`,
        };
      }
      
      // Handle mock tokens from standard email form if we pass custom mock tokens: "mock-token:uid:email:name"
      if (idToken.startsWith('mock-token:')) {
        const [, uid, email, name] = idToken.split(':');
        return {
          uid: uid || 'mock-user-uid',
          email: email || 'mock-user@stash.app',
          name: name || 'Mock Stasher',
        };
      }

      throw new Error('Firebase Admin Auth credentials are not configured in .env');
    },
  };
}

export const db = dbInstance;
export const authAdmin = authAdminInstance;
export type FirestoreDb = typeof db;
