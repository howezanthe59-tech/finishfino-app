const base = 'http://127.0.0.1:4000';

function getCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  return String(setCookieHeader).split(';')[0];
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function run() {
  const out = [];
  const add = (step, ok, details) => out.push({ step, ok, details });

  const health = await fetch(`${base}/api/health`);
  add('health', health.status === 200, `status=${health.status}`);

  const productsRes = await fetch(`${base}/api/products`);
  const products = await readJson(productsRes);
  add('products', productsRes.status === 200 && Array.isArray(products), `status=${productsRes.status}`);

  const inStock = Array.isArray(products)
    ? products.find((p) => String(p.status || '').toLowerCase() === 'in_stock')
    : null;

  const email = `smoke_${Date.now()}@example.com`;
  const signupRes = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Smoke Test',
      email,
      password: 'StrongPass123!',
      phone: '1234567890',
      address: 'Kingston'
    })
  });
  const signup = await readJson(signupRes);
  const cookie = getCookie(signupRes.headers.get('set-cookie'));
  add('signup', signupRes.status === 201 && !!signup?.user && !!cookie, `status=${signupRes.status}`);

  const meRes = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
  add('me', meRes.status === 200, `status=${meRes.status}`);

  if (inStock) {
    const orderRes = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        items: [{ id: inStock.id, name: inStock.name, price: 0.01, quantity: 1 }],
        totals: { total: 0.01, deposit: 0, balance: 0 },
        payment: { accountType: 'debit', accountLast4: '4242' },
        customer: { fullName: 'Smoke Test', email, phone: '1234567890', address: 'Kingston' }
      })
    });
    const order = await readJson(orderRes);
    add('order', orderRes.status === 201 && !!order?.orderId, `status=${orderRes.status}`);

    const bookingRes = await fetch(`${base}/api/v2/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        fullName: 'Smoke Test',
        email,
        phone: '1234567890',
        serviceType: 'Deep Clean',
        productSelection: [inStock.name],
        propertyType: 'House',
        bedrooms: 2,
        bathrooms: 1,
        sizeSqft: 900,
        date: '2026-04-15',
        time: '10:00 AM',
        instructions: 'none',
        addOns: [],
        health_acknowledged: true,
        health_notes: '',
        total: 150,
        deposit: 50,
        balance: 100,
        status: 'pending_deposit'
      })
    });
    const booking = await readJson(bookingRes);
    add('booking', bookingRes.status === 201 && !!booking?.bookingId, `status=${bookingRes.status}`);
  } else {
    add('order', false, 'no in-stock product');
    add('booking', false, 'no in-stock product');
  }

  const failed = out.filter((item) => !item.ok);
  console.log(JSON.stringify({ total: out.length, failed: failed.length, out }, null, 2));
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
