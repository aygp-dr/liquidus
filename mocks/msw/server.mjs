// Demo MSW mock — Solidus v1 classic API, real-shaped data, in-process cart + order state.
// Combines liquidus-001 (mock) + liquidus-008 (session shim) into a single demo server.
// Deliberately violates the three-file public-repo constraint; see README.org §Demo mock exception.

import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (name) => JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8"));

const PORT = Number(process.env.LIQUIDUS_MOCK_PORT) || 4010;
const CATALOG = load("products.json");
const TAXONOMIES = load("taxonomies.json");
const HISTORICAL_ORDERS = load("orders.json");

// In-memory session state — token → cart
const SESSIONS = new Map();

function mintOrder() {
  const token = "tok_msw_" + randomUUID().slice(0, 12);
  const order = {
    id: 2000 + SESSIONS.size + 1,
    number: `R00${2000 + SESSIONS.size + 1}`,
    token,
    state: "cart",
    line_items: [],
    item_total: "0.00",
    total: "0.00",
    completed_at: null,
  };
  SESSIONS.set(token, order);
  return order;
}

function recomputeTotals(order) {
  const total = order.line_items.reduce((s, li) => s + li.quantity * parseFloat(li.price), 0);
  order.item_total = total.toFixed(2);
  order.total = total.toFixed(2);
}

const requiresBearer = (req) => (req.headers.get("authorization") || "").startsWith("Bearer ");

const handlers = [
  // Products list — filter by ?q=; paginate is a v1.4+ nicety
  http.get("*/products", ({ request }) => {
    if (!requiresBearer(request)) return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").toLowerCase();
    let products = CATALOG.products;
    if (q) products = products.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    return HttpResponse.json({
      products, count: products.length, total_count: products.length,
      current_page: 1, per_page: 25, pages: 1,
    });
  }),

  // Product detail
  http.get("*/products/:id", ({ request, params }) => {
    if (!requiresBearer(request)) return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    const p = CATALOG.products.find((x) => String(x.id) === String(params.id));
    if (!p) return HttpResponse.json({ error: "Not Found" }, { status: 404 });
    return HttpResponse.json(p);
  }),

  // Taxonomies
  http.get("*/taxonomies", ({ request }) => {
    if (!requiresBearer(request)) return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    return HttpResponse.json(TAXONOMIES);
  }),

  // Cart: create order (mints a session token)
  http.post("*/orders", async ({ request }) => {
    if (!requiresBearer(request)) return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    return HttpResponse.json(mintOrder(), { status: 201 });
  }),

  // Cart: show current (needs X-Spree-Order-Token OR creates fresh cart)
  http.get("*/orders/current", ({ request }) => {
    if (!requiresBearer(request)) return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = request.headers.get("x-spree-order-token");
    if (token && SESSIONS.has(token)) return HttpResponse.json(SESSIONS.get(token));
    const fresh = mintOrder();
    return HttpResponse.json(fresh, { headers: { "x-spree-order-token": fresh.token } });
  }),

  // Cart: add line item (session-consistent — see liquidus-008)
  http.post("*/orders/current/line_items", async ({ request }) => {
    if (!requiresBearer(request)) return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = request.headers.get("x-spree-order-token");
    if (!token || !SESSIONS.has(token)) return HttpResponse.json({ error: "X-Spree-Order-Token required" }, { status: 401 });
    const body = await request.json();
    const { variant_id, quantity } = (body?.line_item || {});
    const product = CATALOG.products.find((p) => String(p.id) === String(variant_id));
    const price = product ? product.display_price.replace("$", "") : "10.00";
    const order = SESSIONS.get(token);
    order.line_items.push({
      id: order.line_items.length + 1,
      variant_id: Number(variant_id),
      quantity: Number(quantity || 1),
      price,
      sku: product?.sku || `UNK-${variant_id}`,
    });
    recomputeTotals(order);
    return HttpResponse.json(order);
  }),

  // Order by number (historical or session)
  http.get("*/orders/:number", ({ request, params }) => {
    if (!requiresBearer(request)) return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    const number = String(params.number);
    if (number === "mine") return HttpResponse.json(HISTORICAL_ORDERS);
    const hist = HISTORICAL_ORDERS.orders.find((o) => o.number === number);
    if (hist) return HttpResponse.json(hist);
    for (const o of SESSIONS.values()) if (o.number === number) return HttpResponse.json(o);
    return HttpResponse.json({ error: "Not Found", number }, { status: 404 });
  }),
];

const msw = setupServer(...handlers);
msw.listen({ onUnhandledRequest: "warn" });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  try {
    const upstream = await fetch("http://msw.invalid" + url.pathname + url.search, {
      method: req.method,
      headers: req.headers,
      body,
    });
    res.statusCode = upstream.status;
    upstream.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "msw-proxy-failed", message: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`[liquidus-demo-mock] MSW-backed, curated data, on :${PORT}`);
  console.log(`[liquidus-demo-mock] products=${CATALOG.products.length}, taxonomies=${TAXONOMIES.taxonomies.length}, historical_orders=${HISTORICAL_ORDERS.orders.length}`);
});
