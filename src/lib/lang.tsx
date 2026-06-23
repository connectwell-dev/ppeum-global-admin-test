import { createContext, useContext, useState, type ReactNode } from 'react'
import { tokenStore } from './api'
import type { Language } from './types'

interface LangContextValue {
  lang: Language
  setLang: (lang: Language) => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>((tokenStore.lang as Language) || 'ko')

  const setLang = (next: Language) => {
    tokenStore.setLang(next)
    setLangState(next)
  }

  return (
    <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
