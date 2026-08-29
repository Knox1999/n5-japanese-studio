import Link from 'next/link';
import Image from 'next/image';

export default function NotFound(){
  const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';
  return <main className="nv58-not-found">
    <section>
      <Image src={`${basePath}/assets/nihongo-vibes-logo-192.png`} alt="The Nihongo Vibes" width={96} height={96}/>
      <span>404 · PAGE NOT FOUND</span>
      <h1>পেজটি পাওয়া যায়নি</h1>
      <p>লিংকটি পুরনো বা ভুল হতে পারে। আপনার study progress নিরাপদ আছে—Studio Home-এ ফিরে যান।</p>
      <Link href={`${basePath}/?view=dashboard`}>Open The Nihongo Vibes</Link>
    </section>
  </main>
}
