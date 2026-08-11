#!/usr/bin/env node
/**
 * End-to-end API smoke tests against a running ClientForge API.
 * Usage: node scripts/api-smoke.mjs [baseUrl]
 */
const base = (process.argv[2] || 'http://127.0.0.1:3001').replace(/\/$/, '');

async function req(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`ClientForge API smoke → ${base}`);

  const health = await req('/api/health');
  assert(health.ok === true, 'health not ok');
  console.log('✓ health', health.db);

  const auth = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'demo@clientforge.app', password: 'demo1234' },
  });
  assert(auth.accessToken, 'missing token');
  assert(auth.user?.email === 'demo@clientforge.app', 'wrong user');
  console.log('✓ login');

  const token = auth.accessToken;
  const dash = await req('/api/dashboard', { token });
  assert(dash.kpis && typeof dash.kpis.clients === 'number', 'dashboard kpis');
  assert(dash.kpis.clients >= 1, 'expected seeded clients');
  console.log('✓ dashboard', dash.kpis);

  const clients = await req('/api/clients', { token });
  assert(Array.isArray(clients) && clients.length >= 1, 'clients empty');
  console.log('✓ clients', clients.length);

  const projects = await req('/api/projects', { token });
  assert(Array.isArray(projects) && projects.length >= 1, 'projects empty');
  console.log('✓ projects', projects.length);

  const invoices = await req('/api/invoices', { token });
  assert(Array.isArray(invoices) && invoices.length >= 1, 'invoices empty');
  console.log('✓ invoices', invoices.length);

  const expenses = await req('/api/expenses', { token });
  assert(Array.isArray(expenses) && expenses.length >= 1, 'expenses empty');
  console.log('✓ expenses', expenses.length);

  const created = await req('/api/clients', {
    method: 'POST',
    token,
    body: {
      name: 'Smoke Test Co',
      email: 'smoke@example.com',
      status: 'lead',
      company: 'Smoke LLC',
    },
  });
  assert(created.id, 'create client failed');
  console.log('✓ create client');

  await req(`/api/clients/${created.id}`, {
    method: 'PATCH',
    token,
    body: { status: 'active' },
  });
  console.log('✓ update client');

  await req(`/api/clients/${created.id}`, { method: 'DELETE', token });
  console.log('✓ delete client');

  console.log('\nAll API smoke tests passed.');
}

main().catch((err) => {
  console.error('\nAPI smoke FAILED:', err.message);
  process.exit(1);
});
