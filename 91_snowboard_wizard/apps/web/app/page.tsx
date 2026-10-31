import dynamic from 'next/dynamic'
import { HeroSection } from '@/components/landing/HeroSection'

const SnowScene = dynamic(
  () => import('@/components/landing/SnowScene').then((m) => m.SnowScene),
  { ssr: false }
)

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <SnowScene />
      <HeroSection />
    </div>
  )
}
