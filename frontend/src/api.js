const root = (window.__SECORA_CONFIG__?.API_BASE || import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const base = `${root}/api`;

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${base}${path}`, options);
  } catch {
    throw new Error("Cannot reach the SECORA API. Check that the backend is running and API_BASE_URL is correct.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = body.detail;
    const err = new Error(typeof d === "string" ? d : d?.message || `Request failed (${res.status})`);
    err.details = d?.errors || [];
    throw err;
  }
  return body;
}

export const api = {
  dashboard: () => request("/dashboard"),
  demo: () => request("/demo", { method: "POST" }),
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/upload", { method: "POST", body: form });
  },
  analyze: (datasetId) =>
    request("/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset_id: datasetId ?? null }),
    }),
  results: (params = {}) => request(`/results?${new URLSearchParams(params)}`),
  blockchain: (limit = 25, offset = 0) => request(`/blockchain?limit=${limit}&offset=${offset}`),
  verify: () => request("/blockchain/verify"),
};
