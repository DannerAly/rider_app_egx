import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// Configurar VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@rider-egx.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const supabase = createAdminClient()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subscriptions?.length) return

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        const error = err as { statusCode?: number }
        // Si 410 Gone o 404, eliminar suscripción expirada
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        throw err
      }
    })
  )

  return results
}
