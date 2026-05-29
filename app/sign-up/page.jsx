import { redirect } from 'next/navigation';

export async function generateMetadata() {
  return {
    title: 'Log In | Armoze',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function SignUpPage() {
  redirect('/sign-in');
}
