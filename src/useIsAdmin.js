import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// null while checking, then true/false. Admin status is just a row in the
// admins table, which each person can only read for themselves.
export function useIsAdmin(userId) {
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
      setIsAdmin(!!data)
    }
    check()
  }, [userId])

  return isAdmin
}
