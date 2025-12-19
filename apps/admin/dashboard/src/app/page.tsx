import { redirect } from 'next/navigation';

// Admin dashboard home redirects to tenants list
export default function HomePage() {
  redirect('/tenants');
}
