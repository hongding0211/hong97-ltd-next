import { http } from '@services/http'
import { useAppStore } from '@stores/general'
import { useEffect, useState } from 'react'

export function useIsAdmin() {
  const { user, isLoading } = useAppStore((state) => ({
    user: state.user,
    isLoading: state.isLoading,
  }))

  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user || isLoading) {
        setIsAdmin(false)
        return
      }

      setAdminLoading(true)
      try {
        const response = await http.get('GetIsAdmin')
        if (response.isSuccess) {
          setIsAdmin(response.data.isAdmin)
        } else {
          setIsAdmin(false)
        }
      } catch (_error) {
        setIsAdmin(false)
      } finally {
        setAdminLoading(false)
      }
    }

    checkAdmin()
  }, [user, isLoading])

  return {
    isAdmin,
    adminLoading,
    user,
  }
}
