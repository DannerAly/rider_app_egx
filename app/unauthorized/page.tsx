import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-zinc-700 mb-4">403</p>
        <h1 className="text-white text-xl font-semibold mb-2">Sin acceso</h1>
        <p className="text-zinc-400 text-sm mb-6">No tienes permiso para ver esta página.</p>
        <Link
          href="/login"
          className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-4"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
