// src/lib/supabase/route.ts
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
export const createRouteClient = () => createRouteHandlerClient({ cookies })
