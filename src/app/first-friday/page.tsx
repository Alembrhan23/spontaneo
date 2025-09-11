// // app/first-friday/page.tsx
// import { Suspense } from "react"
// import FirstFridayClient from "./FirstFridayClient"

// export const runtime = "nodejs"
// export const dynamic = "force-dynamic"

// export default function Page() {
//   return (
//     <Suspense fallback={<LoadingSkeleton />}>
//       <FirstFridayClient />
//     </Suspense>
//   )
// }

// function LoadingSkeleton() {
//   return (
//     <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
//       <div className="mx-auto max-w-7xl px-6 py-8 md:py-10">
//         <div className="animate-pulse space-y-4">
//           <div className="h-7 w-56 rounded-lg bg-slate-200 dark:bg-slate-700" />
//           <div className="h-[520px] w-full rounded-3xl bg-slate-200 dark:bg-slate-700" />
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
//             <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
