import 'dotenv/config';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const checks = [
  ['orders', 'customer_email,customer_name,raw,items'],
  ['newsletter_subscribers', 'email,status'],
  ['notifications', 'body,metadata'],
  ['products', 'data'],
  ['merchant_feed_snapshots', 'snapshot_key,feed_xml,item_count'],
];
const reportOnly = process.argv.includes('--report-only');

if (!supabaseUrl || !publishableKey) {
  throw new Error('Supabase URL and publishable key are required.');
}

const results = [];
for (const [table, columns] of checks) {
  const requestUrl = new URL(`/rest/v1/${table}`, supabaseUrl);
  requestUrl.searchParams.set('select', columns);
  requestUrl.searchParams.set('limit', '0');

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      prefer: 'count=exact',
    },
    redirect: 'error',
  });

  // Do not read the response body. A successful status would mean anonymous
  // access is still possible even though the request deliberately returns zero rows.
  results.push({
    table,
    status: response.status,
    contentRange: response.headers.get('content-range') || '',
    blocked: !response.ok,
  });
}

console.table(results);

const exposedTables = results.filter((result) => !result.blocked);
if (exposedTables.length) {
  if (reportOnly) {
    console.log(
      `Anonymous Supabase access remains enabled for: ${exposedTables.map((result) => result.table).join(', ')}.`,
    );
  } else {
    throw new Error(
      `Anonymous Supabase access remains enabled for: ${exposedTables.map((result) => result.table).join(', ')}.`,
    );
  }
} else {
  console.log('Anonymous Supabase Data API access is blocked for all five tables.');
}
