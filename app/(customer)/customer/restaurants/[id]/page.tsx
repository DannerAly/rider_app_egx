'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Star, Clock, MapPin, Store, Loader2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import CartFAB from '@/components/customer/CartFAB'
import CartDrawer from '@/components/customer/CartDrawer'
import ProductDetail from '@/components/customer/ProductDetail'
import { cn } from '@/lib/utils'

interface Modifier {
  id: string; name: string; price_addition: number; is_available: boolean; sort_order: number
}
interface ModifierGroup {
  id: string; name: string; min_selections: number; max_selections: number
  is_required: boolean; sort_order: number; modifiers: Modifier[]
}
interface Product {
  id: string; name: string; description: string | null; price: number
  image_url: string | null; prep_time_min: number; is_available: boolean
  is_featured: boolean; sort_order: number
  modifier_groups?: ModifierGroup[]
}
interface MenuCategory {
  id: string; name: string; description: string | null; sort_order: number
  products: Product[]
}
interface MerchantInfo {
  id: string; name: string; description: string | null
  address: string; rating: number; total_orders: number
  avg_prep_time_min: number; min_order_amount: number
  opening_hours: Record<string, { open: string; close: string }> | null
  merchant_categories: { name: string } | null
}

export default function RestaurantPage() {
  const router = useRouter()
  const params = useParams()
  const merchantId = params.id as string

  const { cart, addItem, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart()

  const [merchant, setMerchant] = useState<MerchantInfo | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => { fetchMenu() }, [merchantId])

  const fetchMenu = async () => {
    const res = await fetch(`/api/customer/merchants/${merchantId}/menu`)
    const json = await res.json()
    setMerchant(json.merchant)
    setCategories(json.categories ?? [])
    if (json.categories?.[0]) setActiveSection(json.categories[0].id)
    setLoading(false)
  }

  const handleAddToCart = (item: any, qty: number) => {
    if (!merchant) return
    // Si el carrito tiene items de otro merchant, avisar
    if (cart && cart.merchant_id !== merchantId) {
      if (!confirm(`Tu carrito tiene items de "${cart.merchant_name}". ¿Reemplazar con "${merchant.name}"?`)) return
    }
    addItem(merchantId, merchant.name, item, qty)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-6">
        <Store className="w-12 h-12 text-zinc-300 mb-4" />
        <p className="text-zinc-500">Comercio no encontrado</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-600 text-sm font-medium">Volver</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header del merchant */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-5 py-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>

          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-zinc-900 font-bold text-xl">{merchant.name}</h1>
              <p className="text-zinc-400 text-xs mt-0.5">{merchant.merchant_categories?.name ?? 'Comercio'}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  {Number(merchant.rating).toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {merchant.avg_prep_time_min} min
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {merchant.address}
                </span>
              </div>
              {merchant.description && (
                <p className="text-zinc-500 text-xs mt-2">{merchant.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Category tabs */}
        {categories.length > 1 && (
          <div className="max-w-lg mx-auto px-5 pb-2">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveSection(cat.id)
                    document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    activeSection === cat.id
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'text-zinc-500 border-zinc-200 hover:border-zinc-300'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="max-w-lg mx-auto px-5 py-5 space-y-6 pb-24">
        {categories.map(cat => (
          <div key={cat.id} id={`cat-${cat.id}`}>
            <h2 className="text-zinc-900 font-semibold text-base mb-3">{cat.name}</h2>
            <div className="space-y-2">
              {cat.products
                .filter(p => p.is_available)
                .map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="w-full bg-white rounded-xl border border-zinc-200 p-4 text-left hover:shadow-sm transition-shadow flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-900 font-medium text-sm">{product.name}</p>
                    {product.description && (
                      <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2">{product.description}</p>
                    )}
                    <p className="text-zinc-900 font-semibold text-sm mt-1.5">Bs. {Number(product.price).toFixed(2)}</p>
                  </div>
                  {product.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-16">
            <Store className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Este comercio aún no tiene productos</p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={handleAddToCart}
        />
      )}

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
