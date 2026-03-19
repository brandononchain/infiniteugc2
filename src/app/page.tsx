import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import MetricsBar from "@/components/metrics-bar";
import Features from "@/components/features";
import HowItWorks from "@/components/how-it-works";
import Showcase from "@/components/showcase";
import Testimonials from "@/components/testimonials";
import Pricing from "@/components/pricing";
import FAQ from "@/components/faq";
import FinalCTA from "@/components/final-cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <MetricsBar />
      <Features />
      <HowItWorks />
      <Showcase />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}
