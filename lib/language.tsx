'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppLanguage='bn'|'en';

const LANGUAGE_KEY='nihongo_vibes_language_v1';

type LanguageContextValue={
  language:AppLanguage;
  setLanguage:(language:AppLanguage)=>void;
  text:(bn:string,en:string)=>string;
};

const LanguageContext=createContext<LanguageContextValue|null>(null);

function storedLanguage(fallback:AppLanguage):AppLanguage{
  if(typeof window==='undefined')return fallback;
  try{
    const query=new URLSearchParams(window.location.search).get('lang');
    if(query==='bn'||query==='en')return query;
    const saved=window.localStorage.getItem(LANGUAGE_KEY);
    if(saved==='bn'||saved==='en')return saved;
  }catch{}
  return fallback;
}

export function LanguageProvider({children,initialLanguage='bn'}:{children:ReactNode;initialLanguage?:AppLanguage}){
  const [language,setLanguageState]=useState<AppLanguage>(initialLanguage);

  useEffect(()=>setLanguageState(storedLanguage(initialLanguage)),[initialLanguage]);

  useEffect(()=>{
    document.documentElement.lang=language;
    document.documentElement.dataset.language=language;
    try{window.localStorage.setItem(LANGUAGE_KEY,language)}catch{}
    window.dispatchEvent(new Event('nihongo:language-change'));
  },[language]);

  const value=useMemo<LanguageContextValue>(()=>({
    language,
    setLanguage:setLanguageState,
    text:(bn,en)=>language==='bn'?bn:en,
  }),[language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(){
  const context=useContext(LanguageContext);
  if(!context)throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function readStoredLanguage():AppLanguage{
  return storedLanguage('bn');
}
