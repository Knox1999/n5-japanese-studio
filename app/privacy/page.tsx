import type { Metadata } from 'next';
import Image from 'next/image';

const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';

export const metadata:Metadata={
  title:'গোপনীয়তা নীতি',
  description:'The Nihongo Vibes কীভাবে local learning progress ও optional analytics ব্যবহার করে।',
  alternates:{canonical:'https://knox1999.github.io/n5-japanese-studio/privacy/'},
};

export default function PrivacyPage(){
  return <main className="privacy-page" id="main-content">
    <a className="privacy-brand" href={`${basePath}/`}>
      <Image src={`${basePath}/assets/nihongo-vibes-logo-192.png`} alt="The Nihongo Vibes" width={96} height={96}/>
      <span><b>The Nihongo Vibes</b><small>JLPT N5 Japanese Learning Studio</small></span>
    </a>
    <article>
      <p className="section-kicker">PRIVACY · সহজ ভাষায়</p>
      <h1 className="font-bn">আপনার শেখার তথ্য আপনার device-এই থাকে</h1>
      <p className="font-bn">The Nihongo Vibes-এ account বা server-side profile নেই। Vocabulary mastery, SRS progress এবং app preference আপনার browser-এর local storage-এ সংরক্ষিত হয়।</p>

      <h2 className="font-bn">ঐচ্ছিক Analytics</h2>
      <p className="font-bn">আপনি “অনুমতি দিন” নির্বাচন করলেই Google Analytics চালু হয়। এটি site-এর কোন feature ব্যবহার হচ্ছে তা বোঝার জন্য anonymous usage event নিতে পারে। অনুমতি না দিলে analytics script load হয় না।</p>

      <h2 className="font-bn">আপনার নিয়ন্ত্রণ</h2>
      <ul className="font-bn">
        <li>Browser site data মুছলে local progress ও analytics preference মুছে যাবে।</li>
        <li>Backup / Restore দিয়ে নিজের progress file নিজে সংরক্ষণ করতে পারেন।</li>
        <li>Japanese voice browser/operating system-এর Web Speech feature ব্যবহার করে; কোনো paid voice API-তে text পাঠানো হয় না।</li>
      </ul>

      <h2 className="font-bn">Third-party resources</h2>
      <p className="font-bn">Kanji stroke graphics KanjiVG থেকে build-time-এ নিয়ে sanitize ও app-এর নিজস্ব static assets হিসেবে পরিবেশন করা হয়। Google Analytics কেবল আপনার consent-এর পরে load হয়।</p>

      <a className="premium-btn premium-btn-primary" href={`${basePath}/`}>Learning Studio-তে ফিরে যান</a>
    </article>
  </main>;
}
