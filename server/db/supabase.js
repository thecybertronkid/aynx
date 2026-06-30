const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const isPlaceholder = !supabaseUrl || 
                      supabaseUrl.includes('YOUR_PROJECT_ID') || 
                      !supabaseServiceKey || 
                      supabaseServiceKey.includes('YOUR_SUPABASE_SERVICE_ROLE_KEY');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Seed initial mock licenses if not present
const licensesFile = path.join(DATA_DIR, 'license_keys.json');
if (!fs.existsSync(licensesFile)) {
  fs.writeFileSync(licensesFile, JSON.stringify([
    { key: 'AYNX-FREE-PLAN-2026', plan: 'Free', expires_at: null, activated_by: null },
    { key: 'AYNX-PLUS-PLAN-2026', plan: 'Plus', expires_at: null, activated_by: null },
    { key: 'AYNX-PRO-PLAN-2026', plan: 'Pro', expires_at: null, activated_by: null }
  ], null, 2), 'utf8');
}

// ─── Local JSON Database Mock client (maps to Supabase API query builder) ──────
class MockQueryBuilder {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orderByField = null;
    this.orderAscending = true;
    this.limitVal = null;
  }

  select(fields) {
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  order(field, options = {}) {
    this.orderByField = field;
    this.orderAscending = options.ascending !== false;
    return this;
  }

  limit(val) {
    this.limitVal = val;
    return this;
  }

  _getData() {
    const file = path.join(DATA_DIR, `${this.table}.json`);
    if (!fs.existsSync(file)) return [];
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (_) {
      return [];
    }
  }

  _writeData(data) {
    const file = path.join(DATA_DIR, `${this.table}.json`);
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (_) {}
  }

  async single() {
    const data = this._getData();
    let filtered = data.filter(item => {
      return this.filters.every(f => item[f.field] === f.value);
    });

    if (this.orderByField) {
      filtered.sort((a, b) => {
        const valA = a[this.orderByField];
        const valB = b[this.orderByField];
        if (valA < valB) return this.orderAscending ? -1 : 1;
        if (valA > valB) return this.orderAscending ? 1 : -1;
        return 0;
      });
    }

    const item = filtered[0] || null;
    return { data: item, error: item ? null : new Error('Record not found') };
  }

  async selectAll() {
    const data = this._getData();
    let filtered = data.filter(item => {
      return this.filters.every(f => item[f.field] === f.value);
    });
    return { data: filtered, error: null };
  }

  then(onfulfilled, onrejected) {
    return this.selectAll().then(onfulfilled, onrejected);
  }

  async insert(record) {
    const data = this._getData();
    if (Array.isArray(record)) {
      record.forEach(r => {
        if (!r.id) r.id = Math.random().toString(36).substring(2, 11);
        r.created_at = new Date().toISOString();
        data.push(r);
      });
    } else {
      if (!record.id) record.id = Math.random().toString(36).substring(2, 11);
      record.created_at = new Date().toISOString();
      data.push(record);
    }
    this._writeData(data);
    return { data: record, error: null };
  }

  async upsert(record, options = {}) {
    const data = this._getData();
    const conflictField = options.onConflict || 'id';
    
    const existingIndex = data.findIndex(item => item[conflictField] === record[conflictField]);
    if (existingIndex !== -1) {
      data[existingIndex] = { ...data[existingIndex], ...record, updated_at: new Date().toISOString() };
      record = data[existingIndex];
    } else {
      if (!record.id) {
        record.id = 'AYNX-USER-' + Math.random().toString(36).substring(2, 11).toUpperCase();
      }
      record.created_at = new Date().toISOString();
      record.updated_at = new Date().toISOString();
      data.push(record);
    }
    this._writeData(data);
    
    // Return compatible format with select().single()
    return {
      data: record,
      error: null,
      select: () => ({
        single: () => ({ data: record, error: null })
      })
    };
  }

  async update(record) {
    const data = this._getData();
    let updated = [];
    data.forEach((item, index) => {
      const match = this.filters.every(f => item[f.field] === f.value);
      if (match) {
        data[index] = { ...item, ...record, updated_at: new Date().toISOString() };
        updated.push(data[index]);
      }
    });
    this._writeData(data);
    return { data: updated, error: null };
  }
}

const mockClient = {
  from: (table) => new MockQueryBuilder(table)
};

let supabase = null;
let supabasePublic = null;

if (isPlaceholder) {
  console.warn('[Supabase] Missing or placeholder credentials — using fully simulated local fallback mode.');
  supabase = mockClient;
  supabasePublic = mockClient;
} else {
  console.log('[Supabase] Active credentials detected — connecting to database cluster.');
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
  supabasePublic = createClient(supabaseUrl, supabaseAnonKey);
}

module.exports = { supabase, supabasePublic };
