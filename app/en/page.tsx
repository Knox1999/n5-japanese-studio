import type { Metadata } from 'next';
import AppEntry from '@/components/AppEntry';

const SITE='https://knox1999.github.io/n5-japanese-studio';

export const metadata:Metadata={
  title:'Free JLPT N5 Japanese Learning Studio',
  description:'Try free JLPT N5 vocabulary, listening, grammar and diagnostic practice before creating your personal study workspace.',
  alternates:{
    canonical:`${SITE}/en/`,
    languages:{'bn-BD':`${SITE}/`,'en':`${SITE}/en/`,'x-default':`${SITE}/`},
  },
};

export default function EnglishHome(){
  return <AppEntry initialLanguage="en"/>;
}
