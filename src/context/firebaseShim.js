import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot
} from "firebase/firestore";

// Determine if we are using environment variables for Firebase config
// Provide placeholders so the user can paste theirs
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSy_REPLACE_ME",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "coding-lms-6d2fb.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "coding-lms-6d2fb",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "coding-lms-6d2fb.appspot.com",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseShimCollection {
    constructor(db, collectionName) {
        this.db = db;
        this.collectionName = collectionName;
        this.collectionRef = collection(db, collectionName);
        this._unsubs = {};
    }

    _parseFilter(filterString) {
        if (!filterString) return null;
        // Simple regex to parse 'field="value"' or `field="value"` or 'field=value'
        const match = filterString.match(/([a-zA-Z0-9_]+)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^'"\s]+))/);
        if (match) {
            const field = match[1];
            const value = match[2] || match[3] || match[4];
            return where(field, "==", value);
        }
        return null;
    }

    _parseSort(sortString) {
        if (!sortString) return null;
        if (sortString.startsWith("-")) {
            return orderBy(sortString.substring(1), "desc");
        }
        return orderBy(sortString, "asc");
    }

    async getFullList(options = {}) {
        let q = this.collectionRef;
        const constraints = [];

        if (options.filter) {
            // Very naive split for Multiple conditions using &&
            const filters = options.filter.split("&&").map(f => f.trim());
            for (const f of filters) {
                const parsedWhere = this._parseFilter(f);
                if (parsedWhere) constraints.push(parsedWhere);
            }
        }

        if (options.sort) {
            const parsedOrder = this._parseSort(options.sort);
            if (parsedOrder) constraints.push(parsedOrder);
        }

        if (constraints.length > 0) {
            q = query(this.collectionRef, ...constraints);
        }

        try {
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (err) {
            console.error(`FirebaseShim [${this.collectionName}]: getFullList Error`, err, options);
            throw err;
        }
    }

    async getList(page = 1, perPage = 100, options = {}) {
        // Mock getList implementation prioritizing returning data
        // Native Firestore pagination is complex, so we fetch full list and slice it in-memory for simplicity.
        try {
            const fullList = await this.getFullList(options);
            const start = (page - 1) * perPage;
            const items = fullList.slice(start, start + perPage);
            return {
                page,
                perPage,
                totalItems: fullList.length,
                totalPages: Math.ceil(fullList.length / perPage),
                items
            };
        } catch (err) {
            console.error(`FirebaseShim [${this.collectionName}]: getList Error`, err);
            throw err;
        }
    }

    async getOne(id, options = {}) {
        try {
            const docRef = doc(this.db, this.collectionName, id);
            const snapshot = await getDoc(docRef);
            if (!snapshot.exists()) throw new Error("Document not found");
            return { id: snapshot.id, ...snapshot.data() };
        } catch (err) {
            console.error(`FirebaseShim [${this.collectionName}]: getOne Error`, err);
            throw err;
        }
    }

    async create(data, options = {}) {
        try {
            // if we need a specific ID (though usually auto-gen)
            if (data.id) {
                const docRef = doc(this.db, this.collectionName, data.id);
                // remove ID from data body to avoid duplicating mapping
                const dataCopy = { ...data };
                delete dataCopy.id;
                // Add default fields commonly used in PocketBase
                dataCopy.created = new Date().toISOString();
                dataCopy.updated = new Date().toISOString();
                await setDoc(docRef, dataCopy);
                return { id: docRef.id, ...dataCopy };
            } else {
                data.created = new Date().toISOString();
                data.updated = new Date().toISOString();
                const docRef = await addDoc(this.collectionRef, data);
                return { id: docRef.id, ...data };
            }
        } catch (err) {
            console.error(`FirebaseShim [${this.collectionName}]: create Error`, err);
            throw err;
        }
    }

    async update(id, data, options = {}) {
        try {
            const docRef = doc(this.db, this.collectionName, id);
            // Pocketbase ignores properties that are strictly schema managed unless forced
            data.updated = new Date().toISOString();
            await updateDoc(docRef, data);
            return { id, ...data };
        } catch (err) {
            console.error(`FirebaseShim [${this.collectionName}]: update Error`, err);
            throw err;
        }
    }

    async delete(id, options = {}) {
        try {
            const docRef = doc(this.db, this.collectionName, id);
            await deleteDoc(docRef);
            return true;
        } catch (err) {
            console.error(`FirebaseShim [${this.collectionName}]: delete Error`, err);
            throw err;
        }
    }

    async subscribe(topic, callback) {
        // Pocketbase uses `*` to subscribe to all events or `id` for specific
        // For simplicity, we just watch the whole collection
        const unsub = onSnapshot(this.collectionRef, (snapshot) => {
            // To mimic PocketBase event slightly (just calling the callback)
            callback({ action: "update", record: {} });
        });
        
        let subKey = topic === '*' ? 'all' : topic;
        this._unsubs[subKey] = unsub;
        return unsub; // Returns the unsubscribe function as a Promise resolution (via async)
    }

    async unsubscribe(topic) {
        let subKey = topic === '*' ? 'all' : topic;
        if (this._unsubs[subKey]) {
            this._unsubs[subKey]();
            delete this._unsubs[subKey];
        }
    }
}

class FirebaseShim {
    constructor() {
        this.db = db;
        this._collections = {};
    }

    collection(name) {
        if (!this._collections[name]) {
            this._collections[name] = new FirebaseShimCollection(this.db, name);
        }
        return this._collections[name];
    }
}

export const pb = new FirebaseShim();
