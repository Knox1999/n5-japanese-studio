import type { Metadata } from 'next';
import Image from 'next/image';

const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';

export const metadata:Metadata={
  title:'গোপনীয়তা নীতি',
  description:'The Nihongo Vibes account, cloud learning progress, local backup এবং optional analytics কীভাবে ব্যবহার করে।',
  alternates:{canonical:'https://knox1999.github.io/n5-japanese-studio/privacy/'},
};

export default function PrivacyPage(){
  return <main className="privacy-page" id="main-content">
    <a className="privacy-brand" href={`${basePath}/`}>
      <Image src={`${basePath}/assets/nihongo-vibes-logo-192.png`} alt="The Nihongo Vibes" width={96} height={96}/>
      <span><b>The Nihongo Vibes</b><small>JLPT N5 Japanese Learning Studio</small></span>
    </a>
    <article>
      <p className="section-kicker">PRIVACY · UPDATED 01 SEP 2026</p>
      <h1 className="font-bn">আপনার শেখার তথ্য ও নিয়ন্ত্রণ</h1>
      <p className="font-bn">The Nihongo Vibes account তৈরি করলে Supabase Auth আপনার email, display name এবং secure authentication record সংরক্ষণ করে। Vocabulary mastery, SRS, mistakes, lesson state ও mock history প্রথমে browser-এ থাকে এবং signed-in অবস্থায় আপনার ব্যক্তিগত cloud progress row-তে backup হয়। অন্য ব্যবহারকারী এই row দেখতে পারেন না।</p>

      <h2 className="font-bn">কোন তথ্য রাখা হয়</h2>
      <ul className="font-bn">
        <li>Email, display name, account status এবং login-এর সময়।</li>
        <li>Lesson, mastery, SRS, mistake queue, mock answers/history ও চলমান mock attempt-এর JSON backup।</li>
        <li>Password Supabase Auth hash করে রাখে; site administrator plaintext password দেখতে পারেন না।</li>
      </ul>

      <h2 className="font-bn">Cloud sync ও conflict protection</h2>
      <p className="font-bn">প্রতিটি device-এর local ও cloud backup timestamp অনুযায়ী merge করা হয়। History, mastery ও learning journey একত্র করা হয় এবং stale cloud copy নতুন local progress মুছে দিতে পারে না। Account menu থেকে data export বা account স্থায়ীভাবে delete করা যায়।</p>

      <h2 className="font-bn">ঐচ্ছিক Analytics</h2>
      <p className="font-bn">আপনি consent banner-এ “অনুমতি দিন” নির্বাচন করলেই Google Analytics চালু হয়। এটি কোন feature ব্যবহার হচ্ছে তা বোঝার জন্য pseudonymous usage event নিতে পারে। অনুমতি না দিলে analytics script load হয় না; পরে Privacy settings থেকে সিদ্ধান্ত বদলানো যায়।</p>

      <h2 className="font-bn">আপনার নিয়ন্ত্রণ</h2>
      <ul className="font-bn">
        <li>Account menu থেকে cloud ও local data-সহ JSON export download করতে পারেন।</li>
        <li>Backup / Restore দিয়ে local progress file সংরক্ষণ বা import করতে পারেন।</li>
        <li>Account মুছলে Auth user এবং cascade হওয়া profile, role ও cloud progress স্থায়ীভাবে মুছে যায়।</li>
        <li>Primary Japanese audio app-এর static MP3 assets থেকে আসে; unavailable হলে device-এর Web Speech feature fallback হিসেবে ব্যবহৃত হয়।</li>
      </ul>

      <h2 className="font-bn">Third-party resources</h2>
      <p className="font-bn">Account ও progress Supabase-এ, consent দিলে analytics Google Analytics-এ, এবং Kanji stroke graphics sanitized KanjiVG static assets হিসেবে পরিবেশিত হয়। Free mock directory external provider-এর মূল site খুলে দেয়; তাদের নিজস্ব privacy policy প্রযোজ্য।</p>

      <h2 className="font-bn">যোগাযোগ</h2>
      <p className="font-bn">Privacy, data export বা deletion নিয়ে সহায়তার জন্য project-এর GitHub support channel ব্যবহার করুন।</p>
      <p><a href="https://github.com/Knox1999/n5-japanese-studio/issues" target="_blank" rel="noreferrer noopener">GitHub Support / Issues</a> · <a href={`${basePath}/terms/`}>ব্যবহারের শর্ত</a></p>

      <a className="premium-btn premium-btn-primary" href={`${basePath}/`}>Learning Studio-তে ফিরে যান</a>
    </article>
  </main>;
}
