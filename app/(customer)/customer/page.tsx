'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Star, Clock, Store, Loader2, ChevronRight, LogOut, ShoppingBag, Package } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import CartFAB from '@/components/customer/CartFAB'
import CartDrawer from '@/components/customer/CartDrawer'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface MerchantCategory {
  id: string; name: string; slug: string; icon: string
}
interface Merchant {
  id: string; name: string; slug: string; description: string | null
  logo_url: string | null; banner_url: string | null
  address: string; lat: number; lng: number
  rating: number; total_orders: number; avg_prep_time_min: number
  min_order_amount: number; is_featured: boolean
  distance_km?: number
  merchant_categories: MerchantCategory | null
}

export default function CustomerHome() {
  const router = useRouter()
  const supabase = createClient()
  const { cart, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart()

  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [categories, setCategories] = useState<MerchantCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [showCart, setShowCart] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    loadUser()
    fetchMerchants()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(data?.full_name ?? '')
    }
  }

  const fetchMerchants = async (catId?: string, q?: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (catId) params.set('category', catId)
    if (q) params.set('search', q)

    // Intentar obtener ubicación del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          params.set('lat', String(pos.coords.latitude))
          params.set('lng', String(pos.coords.longitude))
          const res = await fetch(`/api/customer/merchants?${params}`)
          const json = await res.json()
          setMerchants(json.data ?? [])
          setCategories(json.categories ?? [])
          setLoading(false)
        },
        async () => {
          const res = await fetch(`/api/customer/merchants?${params}`)
          const json = await res.json()
          setMerchants(json.data ?? [])
          setCategories(json.categories ?? [])
          setLoading(false)
        },
        { timeout: 3000 }
      )
    } else {
      const res = await fetch(`/api/customer/merchants?${params}`)
      const json = await res.json()
      setMerchants(json.data ?? [])
      setCategories(json.categories ?? [])
      setLoading(false)
    }
  }

  const handleCategoryFilter = (catId: string) => {
    const next = activeCategory === catId ? '' : catId
    setActiveCategory(next)
    fetchMerchants(next, search)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchMerchants(activeCategory, search)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const firstName = userName.split(' ')[0] || 'Cliente'

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-400 text-xs">Hola,</p>
              <p className="text-zinc-900 font-bold text-lg">{firstName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/customer/orders')} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200">
                <Package className="w-4 h-4" />
              </button>
              <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar restaurantes, tiendas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </form>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        {/* Categorías */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryFilter(cat.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                  activeCategory === cat.id
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Merchants */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : merchants.length > 0 ? (
          <div className="space-y-3">
            {merchants.map(m => (
              <button
                key={m.id}
                onClick={() => router.push(`/customer/restaurants/${m.id}`)}
                className="w-full bg-white rounded-xl border border-zinc-200 p-4 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0">
                    <Store className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-900 font-semibold text-sm truncate">{m.name}</p>
                      {m.is_featured && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
                          Destacado
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      {m.merchant_categories?.name ?? 'Comercio'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {Number(m.rating).toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {m.avg_prep_time_min} min
                      </span>
                      {m.distance_km !== undefined && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {m.distance_km.toFixed(1)} km
                        </span>
                      )}
                      {m.min_order_amount > 0 && (
                        <span>Min. Bs. {m.min_order_amount}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 mt-1 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Store className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">No hay comercios disponibles</p>
            <p className="text-zinc-400 text-sm mt-1">Intenta con otra categoría o búsqueda</p>
          </div>
        )}
      </div>

      {/* Cart FAB */}
      <CartFAB itemCount={itemCount} subtotal={subtotal} onClick={() => setShowCart(true)} />

      {/* Cart Drawer */}
      {showCart && cart && (
        <CartDrawer
          cart={cart}
          subtotal={subtotal}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateQuantity}
          onRemove={removeItem}
          onClear={clearCart}
          onCheckout={() => { setShowCart(false); router.push('/customer/checkout') }}
        />
      )}
    </div>
  )
}
