import type { Metadata } from 'next';
import Image from 'next/image';

const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';

export const metadata:Metadata={
  title:'ব্যবহারের শর্ত · Terms of Use',
  description:'The Nihongo Vibes ব্যবহারের শর্ত, educational scope, account responsibilities ও third-party resource policy।',
  alternates:{canonical:'https://knox1999.github.io/n5-japanese-studio/terms/'},
};

export default function TermsPage(){
  return <main className="privacy-page" id="main-content">
    <a className="privacy-brand" href={`${basePath}/`}><Image src={`${basePath}/assets/nihongo-vibes-logo-192.png`} alt="The Nihongo Vibes" width={96} height={96}/><span><b>The Nihongo Vibes</b><small>JLPT N5 Japanese Learning Studio</small></span></a>
    <article>
      <p className="section-kicker">TERMS · UPDATED 01 SEP 2026</p>
      <h1 className="font-bn">ব্যবহারের শর্ত · Terms of Use</h1>
      <p className="font-bn">এই studio self-study ও practice-এর জন্য। এটি Japan Foundation/Japan Educational Exchanges and Services-এর official JLPT product নয় এবং practice percentage official scaled score নয়।</p>
      <h2 className="font-bn">Account ও নিরাপত্তা</h2><ul className="font-bn"><li>সঠিক email ব্যবহার এবং নিজের password নিরাপদ রাখা আপনার দায়িত্ব।</li><li>অন্যের account ব্যবহার, service অপব্যবহার বা access control bypass করা যাবে না।</li><li>Account menu থেকে data export ও permanent deletion করা যায়।</li></ul>
      <h2 className="font-bn">Learning content</h2><p className="font-bn">App-এর mock questions lesson data থেকে original practice হিসেবে তৈরি। External free-resource directory copyrighted প্রশ্ন copy করে না; provider-এর মূল site-এ link করে। ভুল বা ambiguity পেলে support issue খুলুন।</p>
      <h2 className="font-bn">Availability</h2><p className="font-bn">Offline cache ও local backup থাকলেও uninterrupted service guarantee করা হয় না। গুরুত্বপূর্ণ progress নিয়মিত export করে রাখা ভালো।</p>
      <h2 className="font-bn">যোগাযোগ</h2><p><a href="https://github.com/Knox1999/n5-japanese-studio/issues" target="_blank" rel="noreferrer noopener">GitHub Support / Issues</a> · <a href={`${basePath}/privacy/`}>Privacy Policy</a></p>
      <a className="premium-btn premium-btn-primary" href={`${basePath}/`}>Learning Studio-তে ফিরে যান</a>
    </article>
  </main>;
}
