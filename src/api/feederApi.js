import axiosInstance from './axiosInstance';

const DEMO = process.env.REACT_APP_DEMO === '1';

/* ========================= DEMO HELPERS ========================= */

const LS_KEY = 'demoFeeders_v1';

const read = () => JSON.parse(localStorage.getItem(LS_KEY) || '[]');
const write = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const isoNow = () => new Date().toISOString();

const makeConnectCode = () => `DEMO-${rand(100000, 999999)}`;

const makeFeeder = (idx = 1, active = false) => ({
  feederId: `demo-${Date.now()}-${idx}`,
  feederName: `Feeder ${idx}`,
  feederState: active, // true = Active, false = Disabled
  feederConnectCode: makeConnectCode(),
  connectedAt: isoNow(),
  activityTimestamps: active ? seedActivity24h() : [],
});

/** generate 24h of sparse “accelerometer” events (ISO strings) */
function seedActivity24h() {
  const out = [];
  const start = Date.now() - 23 * 3600 * 1000;
  for (let h = 0; h < 24; h++) {
    const bursts = rand(0, 4);
    for (let b = 0; b < bursts; b++) {
      const ts = new Date(start + h * 3600 * 1000 + rand(0, 3599) * 1000).toISOString();
      out.push(ts);
    }
  }
  return out.sort();
}

function ensureSeed() {
  const data = read();
  if (data.length) return data;
  const seeded = [makeFeeder(1, false), makeFeeder(2, false)];
  write(seeded);
  return seeded;
}

function filterActivity(timestamps, fromTs, toTs) {
  if (!fromTs && !toTs) return timestamps;
  const from = fromTs ? new Date(fromTs).getTime() : -Infinity;
  const to = toTs ? new Date(toTs).getTime() : Infinity;
  return timestamps.filter((ts) => {
    const t = new Date(ts).getTime();
    return t >= from && t <= to;
  });
}

/* ========================= REAL API (non-DEMO) ========================= */

async function real_getAllFeeders() {
  const res = await axiosInstance.get('/allFeeders');
  return res.data; // array of { feederId, feederName, feederState, feederConnectCode, ... }
}

async function real_getFeederById(feederId) {
  const res = await axiosInstance.get(`/feeder/${feederId}`);
  return res.data;
}

async function real_getFeeders(userId) {
  const res = await axiosInstance.post('/feeders', { userId });
  return res.data; // { feeders: [...] }
}

async function real_activateFeeder(feederId) {
  const res = await axiosInstance.put(`/feeder/${feederId}/activate`);
  return res.data;
}

async function real_deactivateFeeder(feederId) {
  const res = await axiosInstance.put(`/feeder/${feederId}/deactivate`);
  return res.data;
}

async function real_editFeeder(feederId, updatedData) {
  const res = await axiosInstance.put(`/feeder/${feederId}/edit`, updatedData);
  return res.data.updatedFeeder;
}

async function real_deleteFeeder(feederId) {
  const res = await axiosInstance.delete(`/feeder/${feederId}`);
  return res.data;
}

async function real_connectFeeder(userId, feederConnectCode) {
  const res = await axiosInstance.post('/feeder/connect', { userId, feederConnectCode });
  return res.data; // { message: '...' }
}

async function real_registerFeeder() {
  const res = await axiosInstance.post('/feeder/register');
  return res.data; // { message, feederId, feederConnectCode }
}

async function real_getFeederActivity(feederId, fromTimestamp, toTimestamp) {
  const res = await axiosInstance.post(`/feeder/${feederId}/activityList`, {
    activityFromTimestamp: fromTimestamp,
    activityToTimestamp: toTimestamp,
  });
  return res.data.activityTimestamps; // ISO[]
}

/* ========================= DEMO API ========================= */

async function demo_getAllFeeders() {
  return ensureSeed();
}

async function demo_getFeederById(feederId) {
  const f = ensureSeed().find((x) => x.feederId === feederId);
  if (!f) throw new Error('Feeder not found');
  return f;
}

async function demo_getFeeders(/* userId */) {
  return { feeders: ensureSeed() };
}

async function demo_activateFeeder(feederId) {
  const next = ensureSeed().map((f) =>
    f.feederId === feederId
      ? {
          ...f,
          feederState: true,
          activityTimestamps: f.activityTimestamps?.length ? f.activityTimestamps : seedActivity24h(),
        }
      : f
  );
  write(next);
  return { message: 'Feeder activated (demo).' };
}

async function demo_deactivateFeeder(feederId) {
  const next = ensureSeed().map((f) =>
    f.feederId === feederId ? { ...f, feederState: false } : f
  );
  write(next);
  return { message: 'Feeder deactivated (demo).' };
}

async function demo_editFeeder(feederId, updatedData) {
  const list = ensureSeed();
  const idx = list.findIndex((f) => f.feederId === feederId);
  if (idx < 0) throw new Error('Feeder not found');
  const updated = { ...list[idx], ...updatedData };
  list[idx] = updated;
  write(list);
  return updated; // mirrors real_editFeeder
}

async function demo_deleteFeeder(feederId) {
  const next = ensureSeed().filter((f) => f.feederId !== feederId);
  write(next);
  return { message: 'Feeder deleted (demo).' };
}

async function demo_connectFeeder(/* userId */ _userId, feederConnectCode) {
  if (!feederConnectCode || !/^DEMO/i.test(feederConnectCode)) {
    throw new Error('Invalid demo connect code. Try e.g. DEMO123');
  }
  const list = ensureSeed();
  const newF = makeFeeder(list.length + 1, true);
  list.push(newF);
  write(list);
  return { message: 'Feeder connected (demo).' };
}

async function demo_registerFeeder() {
  const f = makeFeeder(rand(3, 99), false);
  return {
    message: 'Feeder registered (demo).',
    feederId: f.feederId,
    feederConnectCode: f.feederConnectCode,
  };
}

async function demo_getFeederActivity(feederId, fromTimestamp, toTimestamp) {
  const f = ensureSeed().find((x) => x.feederId === feederId);
  if (!f) return [];
  return filterActivity(f.activityTimestamps, fromTimestamp, toTimestamp);
}

/* ========================= PUBLIC EXPORTS ========================= */

export async function getAllFeeders() {
  try {
    return DEMO ? await demo_getAllFeeders() : await real_getAllFeeders();
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch all feeders');
  }
}

export async function getFeederById(feederId) {
  try {
    return DEMO ? await demo_getFeederById(feederId) : await real_getFeederById(feederId);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch feeder by ID');
  }
}

export async function getFeeders(userId) {
  try {
    return DEMO ? await demo_getFeeders(userId) : await real_getFeeders(userId);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch feeders');
  }
}

export async function activateFeeder(feederId) {
  try {
    return DEMO ? await demo_activateFeeder(feederId) : await real_activateFeeder(feederId);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to activate feeder');
  }
}

export async function deactivateFeeder(feederId) {
  try {
    return DEMO ? await demo_deactivateFeeder(feederId) : await real_deactivateFeeder(feederId);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to deactivate feeder');
  }
}

export async function editFeeder(feederId, updatedData) {
  try {
    return DEMO ? await demo_editFeeder(feederId, updatedData) : await real_editFeeder(feederId, updatedData);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || `Failed to update feeder ${feederId}`);
  }
}

export async function deleteFeeder(feederId) {
  try {
    return DEMO ? await demo_deleteFeeder(feederId) : await real_deleteFeeder(feederId);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to delete feeder');
  }
}

export async function connectFeeder(userId, feederConnectCode) {
  try {
    return DEMO ? await demo_connectFeeder(userId, feederConnectCode) : await real_connectFeeder(userId, feederConnectCode);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to connect feeder');
  }
}

export async function registerFeeder() {
  try {
    return DEMO ? await demo_registerFeeder() : await real_registerFeeder();
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to register feeder');
  }
}

export async function getFeederActivity(feederId, fromTimestamp, toTimestamp) {
  try {
    return DEMO
      ? await demo_getFeederActivity(feederId, fromTimestamp, toTimestamp)
      : await real_getFeederActivity(feederId, fromTimestamp, toTimestamp);
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch activity');
  }
}
