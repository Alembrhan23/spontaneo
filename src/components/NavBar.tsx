// components/Navbar.tsx
'use client'

import { LogIn, Search } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'

export default function Navbar() {
  return (
    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4 flex items-center justify-between text-white rounded-b-2xl">
      <h1 className="font-bold text-xl">⚡ Spontaneo</h1>
      <div className="flex gap-4 items-center">
        <Search className="w-5 h-5 cursor-pointer" />
        <LogIn className="w-5 h-5 cursor-pointer" />
         <UserAvatar />
      </div>
    </div>
  )
}

// // components/Navbar.tsx
// 'use client'
// import { Search } from 'lucide-react'


// export default function Navbar() {
//   return (
//     <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4 flex items-center justify-between text-white">
//       <h1 className="font-bold text-xl">⚡ Spontaneo</h1>
//       <div className="flex items-center gap-4">
//         <Search className="w-5 h-5 cursor-pointer" />
//         <UserAvatar />
//       </div>
//     </div>
//   )
// }

