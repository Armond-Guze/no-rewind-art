import AdminDashboardRouteClient from '../../src/next/admin/AdminDashboardRouteClient.tsx';
import { getRouteSeo } from '../../src/next/seo.js';

export async function generateMetadata() {
  const routeSeo = await getRouteSeo(['admin']);

  return routeSeo.metadata;
}

export default function AdminPage() {
  return <AdminDashboardRouteClient />;
}
