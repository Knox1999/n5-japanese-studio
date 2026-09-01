'use client';

import AccountGate from './AccountGate';
import { LanguageProvider, type AppLanguage } from '@/lib/language';

export default function AppEntry({initialLanguage='bn'}:{initialLanguage?:AppLanguage}){
  return <LanguageProvider initialLanguage={initialLanguage}><AccountGate/></LanguageProvider>;
}
