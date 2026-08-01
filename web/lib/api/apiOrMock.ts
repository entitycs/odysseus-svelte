// src/lib/api.ts
const USE_MOCK = import.meta.env.MODE === "production"; // GH-Pages

export async function apiGet(path) {
  if (USE_MOCK) return mockGet(path);
  return fetch(`http://localhost:7000${path}`).then(r => r.json());
}

function mockGet(path) {
  if (path === "/api/user") {
    return {
      id: "demo-user",
      name: "Demo User",
      features: ["limited", "read-only"]
    };
  }
  if (path === "/api/items") {
    return [
      { id: 1, name: "Mock Item A" },
      { id: 2, name: "Mock Item B" }
    ];
  }
  return { error: "Mock endpoint not implemented" };
}
