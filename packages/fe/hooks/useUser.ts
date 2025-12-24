import { useGeneralContext } from '@components/hoc/general-context/GeneralContext'

export function useUser() {
  const { user } = useGeneralContext()
  return user
}
