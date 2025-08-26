'use client'
import Link from 'next/link'
export default function CreateActivityButton() {
return (
<Link href="/create" className="fixed bottom-6 right-6 btn btn-primary shadow-lg">+ Create</Link>
)
}