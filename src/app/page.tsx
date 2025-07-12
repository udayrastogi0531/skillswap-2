"use client";

import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { SkillCategoriesSection } from "@/components/sections/SkillCategoriesSection";
import NotificationDemo from "@/components/NotificationDemo";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      
      {/* Notification System Demo */}
      {/* <div className="container mx-auto py-12">
        <NotificationDemo />
      </div> */}
      
      <FeaturesSection />
      <HowItWorksSection />
      <SkillCategoriesSection />
    </div>
  );
}
