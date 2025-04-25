'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@stores/general'
import { ChevronRight, Meh } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

export function useLogin() {
  const { user, isLoading } = useAppStore((state) => ({
    user: state.user,
    isLoading: state.isLoading,
  }))

  const fallbackComponent = useMemo(() => {
    if (isLoading || user) {
      return null
    }
    return <FallbackComponent />
  }, [isLoading, user])

  return {
    isLogin: user && !isLoading,
    fallbackComponent,
  }
}

const FallbackComponent = () => {
  const { t } = useTranslation('common')
  const router = useRouter()

  const handleClick = () => {
    router.replace(
      `/sso/login?redirect=${encodeURIComponent(window.location.href)}`,
    )
  }

  return (
    <div className="flex justify-center">
      <div className="w-[80%] max-w-[400px] mt-24 md:mt-48">
        <Alert>
          <Meh className="w-4 h-4" />
          <AlertTitle>{t('useLogin.fallback.title')}</AlertTitle>
          <AlertDescription className="mt-5">
            <span className="font-semibold">
              {t('useLogin.fallback.subTitle')}
            </span>
            <div className="flex items-center mt-1">
              <Button className="p-0" variant="link" onClick={handleClick}>
                {t('useLogin.fallback.description')}
              </Button>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
