import { HeroSection } from '@/components/landing/HeroSection'
import { SnowScene } from '@/components/landing/SnowScene'

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <SnowScene />
      <HeroSection />
    </div>
  )
}
