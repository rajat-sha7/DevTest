
"use client";

import Link from "next/link";
import Image from "next/image";
import { GraduationCap, ArrowRight, CheckCircle2, Sparkles, Code2, Layout, Zap, Atom, Terminal, MessageSquareCode, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

export default function LandingPage() {
  useSmoothScroll();
  const heroImage = PlaceHolderImages.find(img => img.id === "hero-code");
  const aiImage = PlaceHolderImages.find(img => img.id === "ai-feature");

  const topics = [
    { id: 'nextjs', label: 'Next.js', count: 100, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    { id: 'react', label: 'React', count: 100, icon: Atom, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100' },
    { id: 'javascript', label: 'JavaScript', count: 100, icon: Code2, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    { id: 'html-css', label: 'HTML & CSS', count: 100, icon: Layout, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navigation */}
      <nav className="h-16 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-headline">DevQnA Prep</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</a>
            <Link href="/coding-round" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              Coding Round
            </Link>
            <Link href="/playground" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              JS Playground
            </Link>
            <Link href="/dashboard">
              <Button className="rounded-full px-6 font-bold shadow-lg shadow-primary/20">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden transition-all duration-300 will-change-transform py-12 lg:py-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-50">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
             <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-accent/10 blur-[100px] rounded-full" />
          </div>

          <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center w-full">
            <div className="space-y-6 text-center lg:text-left">
              <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-primary bg-primary/5 border-primary/10 font-bold uppercase tracking-widest text-[10px]">
                Expert-Curated Interview Prep
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-slate-900 font-headline leading-[1.1]">
                Master the <span className="text-primary">Technical</span> Interview.
              </h1>
              <p className="text-base md:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                400+ expert questions and answers for Next.js, React, JavaScript, and HTML/CSS. 
                Built for senior developers who want to stay ahead of the curve.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/dashboard">
                  <Button size="lg" className="rounded-full px-8 h-12 text-base font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                    Start Preparation <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/coding-round">
                  <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base font-bold hover:bg-slate-50">
                    <Trophy className="w-5 h-5 mr-2 text-amber-500" />
                    Elite Coding Round
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 justify-center lg:justify-start pt-2">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                      <Image src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" width={40} height={40} />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  Joined by <span className="text-slate-900 font-bold">2,000+</span> developers this month
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="max-w-md lg:max-w-none mx-auto w-full aspect-square flex items-center justify-center relative rounded-[2rem] bg-slate-100/50 p-4 md:p-6 group overflow-visible">
                {heroImage && (
                  <Image 
                    src={heroImage.imageUrl} 
                    alt={heroImage.description} 
                    fill 
                    className="object-cover opacity-5 pointer-events-none grayscale rounded-[2rem]"
                    data-ai-hint={heroImage.imageHint}
                  />
                )}
                
                <div className="grid grid-cols-2 gap-3 md:gap-4 w-full relative z-10">
                  {topics.map((topic, i) => (
                    <div 
                      key={topic.id} 
                      className={cn(
                        "rounded-[1.5rem] p-4 md:p-5 border-2 flex flex-col justify-between transition-all duration-500 hover:scale-105 hover:shadow-2xl bg-white shadow-xl relative",
                        topic.bg, topic.border, topic.color,
                        i === 0 ? "animate-float-slow" : i === 1 ? "animate-float-delayed" : i === 2 ? "animate-float-slower" : "animate-float"
                      )}
                    >
                      <div className="space-y-3">
                        <div className={cn("p-2 rounded-xl inline-flex bg-white shadow-sm ring-1 ring-slate-100")}>
                          <topic.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-lg md:text-xl leading-tight font-headline">{topic.label}</h3>
                        <div className="flex items-center gap-2 text-slate-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest leading-none">100 Modules</span>
                        </div>
                      </div>
                      <div className="pt-3 mt-4 border-t border-slate-900/5 flex items-center justify-between">
                         <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Expert Prep</span>
                         <ArrowRight className="w-4 h-4 opacity-30 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[85%] bg-white/95 backdrop-blur-xl rounded-[1.5rem] p-4 md:p-5 shadow-2xl border border-white/50 space-y-3 animate-pulse-slow z-20">
                  <div className="flex items-center gap-2">
                    <MessageSquareCode className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Technical Deep-Dive</span>
                  </div>
                  <h4 className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed font-headline">
                    "Explain the difference between Server Components and Client Components in Next.js 15."
                  </h4>
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest">AI Synthesis Result available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-16 md:py-20 flex items-center justify-center bg-slate-50/50 transition-all duration-300 will-change-transform">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 font-headline">
                Everything you need to master your next interview.
              </h2>
              <p className="text-base md:text-lg text-slate-500">
                We've spent hundreds of hours curating the most important concepts and questions so you don't have to.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  title: "100 Questions Per Topic",
                  description: "Comprehensive coverage from basic fundamentals to expert-level architectural concepts.",
                  icon: Code2,
                  color: "bg-blue-500"
                },
                {
                  title: "Elite Coding Rounds",
                  description: "50 specialized challenges focusing on the most common senior-level Next.js and React interview tasks.",
                  icon: Trophy,
                  color: "bg-amber-500"
                },
                {
                  title: "AI-Powered Deep Dives",
                  description: "Struggling with a concept? Use our integrated AI to get alternative explanations and research paths.",
                  icon: Sparkles,
                  color: "bg-accent"
                }
              ].map((feature, i) => (
                <Card key={i} className="p-6 md:p-7 rounded-[1.5rem] border-none shadow-sm hover:shadow-xl transition-all duration-300 group">
                  <div className={cn("p-3 rounded-xl text-white inline-flex mb-4 group-hover:scale-110 transition-transform", feature.color)}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-headline">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* AI Callout */}
        <section className="py-16 md:py-20 flex items-center px-6 md:px-12 transition-all duration-300 will-change-transform">
          <div className="max-w-7xl mx-auto rounded-[2rem] lg:rounded-[2.5rem] bg-gradient-to-br from-[#295FA3] via-[#1E4B82] to-[#153866] text-primary-foreground overflow-hidden relative shadow-2xl shadow-primary/30 w-full">
            {/* Background Decorations */}
            <div className="absolute inset-0 opacity-40 pointer-events-none">
              <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-white blur-[150px] rounded-full" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#19A9E6] blur-[120px] rounded-full" />
            </div>

            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center p-8 lg:p-14 lg:py-16 lg:px-20 relative z-10">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-3xl lg:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight font-headline leading-[1.1]">
                    Powered by AI. <br />
                    <span className="text-[#19A9E6]">Driven by Experts.</span>
                  </h2>
                  <p className="text-base md:text-lg text-primary-foreground/90 leading-relaxed max-w-xl font-body">
                    Our static answers are just the beginning. Every question has an "AI Deep-Dive" feature that generates contextual research paths and production-quality examples on demand.
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/dashboard">
                    <Button size="lg" className="rounded-full px-8 h-12 text-base font-bold hover:scale-105 transition-all text-[#295FA3] shadow-xl shadow-black/10 bg-white">
                      Try AI Deep-Dive Now
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="relative group">
                <div className="relative rounded-[1.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/20 aspect-video bg-white/10 backdrop-blur-3xl transition-transform duration-700 hover:scale-[1.02]">
                  {aiImage && (
                    <Image 
                      src={aiImage.imageUrl} 
                      alt={aiImage.description} 
                      fill 
                      className="object-cover opacity-60 mix-blend-overlay"
                      data-ai-hint={aiImage.imageHint}
                    />
                  )}
                  <div className="absolute inset-4 border border-white/10 rounded-[1.25rem] pointer-events-none" />
                  <div className="absolute inset-8 border border-white/10 rounded-[1rem] pointer-events-none" />
                </div>
                
                <div className="absolute -top-4 -right-4 bg-white text-[#295FA3] px-5 py-2.5 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.2)] font-bold text-[10px] uppercase tracking-[0.2em] animate-float z-20 border border-slate-100">
                  Live Synthesis
                </div>

                <div className="absolute -bottom-4 -left-4 bg-[#19A9E6] text-white px-5 py-2.5 rounded-xl shadow-[0_8px_20px_rgba(25,169,230,0.3)] font-bold text-[10px] uppercase tracking-[0.2em] animate-float-slow z-20 border border-white/20">
                  Expert Review
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-16 md:py-24 flex items-center justify-center text-center transition-all duration-300 will-change-transform">
          <div className="max-w-4xl mx-auto px-6 space-y-5 w-full">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 font-headline">
              Ready to nail your next interview?
            </h2>
            <p className="text-base md:text-lg text-slate-500">
              Join thousands of developers using DevQnA Prep to level up their careers.
            </p>
            <div className="pt-2">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-full px-8 h-12 text-base font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-all">
                  Start Preparation Free
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary rounded text-primary-foreground">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 font-headline">DevQnA Prep</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <Link href="/coding-round" className="hover:text-primary transition-colors">Coding Round</Link>
            <Link href="/playground" className="hover:text-primary transition-colors">Playground</Link>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
          </div>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} DevQnA Prep. All rights reserved.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.95; transform: translate(-50%, -50%) scale(0.97); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 5s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
