import { redirect } from 'next/navigation';

// "/" normalde next.config.mjs içindeki yönlendirmeyle public/landing.html'e gider; bu dosya yedek.
export default function Home() {
  redirect('/landing.html');
}
