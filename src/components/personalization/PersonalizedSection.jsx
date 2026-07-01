import { useAuthStore } from '../../store/authStore'
import { isStaff } from '../../lib/roles'
import { useRecentlyViewed } from '../../features/personalization/hooks'
import { PersonalizedGreeting } from './PersonalizedGreeting'
import { RecentlyViewedStrip } from './RecentlyViewedStrip'
import { SuggestedForYou } from './SuggestedForYou'

export function PersonalizedSection() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const isCustomer = Boolean(token) && !isStaff(user)
  const { data } = useRecentlyViewed({ enabled: isCustomer })

  if (!isCustomer) return null

  const hasHistory = (data?.data ?? []).length > 0

  return (
    <div className="pt-16">
      <PersonalizedGreeting name={user?.name} hasHistory={hasHistory} />
      <RecentlyViewedStrip />
      <SuggestedForYou />
    </div>
  )
}
