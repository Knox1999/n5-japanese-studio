import Link from 'next/link';

export default function NotFound(){
  return <main className="nv58-not-found">
    <section>
      <img src={`${process.env.NEXT_PUBLIC_BASE_PATH||''}/assets/nihongo-vibes-logo.webp`} alt="The Nihongo Vibes"/>
      <span>404 · PAGE NOT FOUND</span>
      <h1>পেজটি পাওয়া যায়নি</h1>
      <p>লিংকটি পুরনো বা ভুল হতে পারে। আপনার study progress নিরাপদ আছে—Studio Home-এ ফিরে যান।</p>
      <Link href="/?view=dashboard">Open The Nihongo Vibes</Link>
    </section>
  </main>
}
