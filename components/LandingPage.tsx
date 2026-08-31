'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-ivory via-paper to-cream">
      {/* ================================================================
          HEADER / NAVIGATION
          ================================================================ */}
      <header className="header">
        <div className="header-content">
          <Link href="/" className="brand">
            <div className="w-10 h-10 rounded-lg bg-gradient-warm flex items-center justify-center text-white font-display text-xl">
              日
            </div>
            <div>
              <strong>Nihongo Vibes</strong>
              <span>N5 Studio</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-ink hover:text-sakura transition-colors">
              Features
            </Link>
            <Link href="#modules" className="text-ink hover:text-sakura transition-colors">
              Learning Modules
            </Link>
            <Link href="#testimonials" className="text-ink hover:text-sakura transition-colors">
              Testimonials
            </Link>
            <Link href="/app" className="btn btn-primary">
              Start Learning
            </Link>
          </nav>
        </div>
      </header>

      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section className="hero">
        <div className="hero-content">
          <div className="inline-block mb-6">
            <span className="badge badge-primary px-4 py-2 rounded-full text-sm font-semibold">
              ✨ Master Japanese with AI-Powered Learning
            </span>
          </div>

          <h1 className="text-hero font-display text-ink mb-6">
            Learn Japanese N5 <span className="text-gradient">Fluently</span>
          </h1>

          <p className="text-lg text-slate leading-relaxed max-w-2xl mx-auto mb-8">
            A futuristic learning studio designed for structured daily practice. Master vocabulary, grammar, 
            kanji, and conversation with spaced repetition and interactive modules.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/app" className="btn btn-primary btn-large">
              <span>🚀 Start Learning Free</span>
            </Link>
            <button className="btn btn-outline btn-large">
              <span>📚 See How It Works</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✓</span>
              <span>No Account Required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✓</span>
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✓</span>
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES SECTION
          ================================================================ */}
      <section id="features" className="section section-accent">
        <div className="section-header">
          <h2>Why Choose Nihongo Vibes?</h2>
          <p>Everything you need to achieve JLPT N5 fluency</p>
        </div>

        <div className="grid grid-3">
          {[
            {
              icon: '🎯',
              title: 'Smart Recall',
              description: 'Spaced repetition algorithm adapts to your learning pace for maximum retention.',
            },
            {
              icon: '🗣️',
              title: 'Conversation Practice',
              description: 'AI-powered role-play scenarios to practice real-world Japanese conversations.',
            },
            {
              icon: '📊',
              title: 'Progress Tracking',
              description: 'Visual dashboards show your mastery level for every topic and skill.',
            },
            {
              icon: '🎵',
              title: 'Native Audio',
              description: 'High-quality Japanese audio and shadowing practice with native speakers.',
            },
            {
              icon: '📖',
              title: 'Rich Content',
              description: '10,000+ vocabulary items, grammar patterns, and reading materials.',
            },
            {
              icon: '🏆',
              title: 'JLPT Ready',
              description: 'Mock tests and exam preparation aligned with official JLPT standards.',
            },
          ].map((feature, idx) => (
            <div key={idx} className="feature card">
              <div className="feature-icon text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-ink font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          LEARNING MODULES
          ================================================================ */}
      <section id="modules" className="section">
        <div className="section-header">
          <h2>Comprehensive Learning Modules</h2>
          <p>Master every aspect of Japanese language</p>
        </div>

        <div className="grid grid-2 max-w-4xl mx-auto">
          {[
            { title: '語彙 (Vocabulary)', desc: '3,000+ words with audio and mastery tracking', icon: '📝' },
            { title: '文法 (Grammar)', desc: '100+ essential patterns for N5 level', icon: '📚' },
            { title: '漢字 (Kanji)', desc: '250 essential kanji with stroke order', icon: '✏️' },
            { title: '会話 (Conversation)', desc: 'Role-play scenarios for real-world practice', icon: '💬' },
            { title: '聴解 (Listening)', desc: 'Dialogues, stories, and audio exercises', icon: '🎧' },
            { title: '読解 (Reading)', desc: 'Articles, stories, and comprehension tests', icon: '📖' },
            { title: 'ひらがな・カタカナ (Kana)', desc: 'Master phonetic writing systems', icon: '🔤' },
            { title: '模試 (Mock Test)', desc: 'Full JLPT N5 practice tests', icon: '🏆' },
          ].map((module, idx) => (
            <div key={idx} className="card-elevated p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">{module.icon}</div>
              <h3 className="text-ink font-semibold mb-2">{module.title}</h3>
              <p className="text-slate text-sm">{module.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS
          ================================================================ */}
      <section className="section section-alt">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Simple, effective, and proven methodology</p>
        </div>

        <div className="max-w-3xl mx-auto">
          {[
            { step: 1, title: 'Learn', desc: 'Study new vocabulary, grammar, and kanji with interactive lessons' },
            { step: 2, title: 'Practice', desc: 'Complete exercises and speak with AI conversation partners' },
            { step: 3, title: 'Recall', desc: 'Review using spaced repetition for optimal memory retention' },
            { step: 4, title: 'Master', desc: 'Track progress and achieve mastery in each learning module' },
          ].map((item, idx) => (
            <div key={idx} className="flex gap-6 mb-8 items-start">
              <div className="w-12 h-12 rounded-full bg-gradient-warm flex items-center justify-center text-white font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="text-ink font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-slate leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          TESTIMONIALS
          ================================================================ */}
      <section id="testimonials" className="section">
        <div className="section-header">
          <h2>What Learners Say</h2>
          <p>Success stories from our community</p>
        </div>

        <div className="grid grid-2 max-w-4xl mx-auto">
          {[
            {
              name: 'Sarah Chen',
              role: 'Passed JLPT N5',
              text: 'Nihongo Vibes helped me structure my daily study routine. The spaced repetition really works!',
              rating: 5,
            },
            {
              name: 'Marcus Williams',
              role: 'Language Enthusiast',
              text: 'The conversation practice feature is amazing. Finally felt confident speaking Japanese.',
              rating: 5,
            },
            {
              name: 'Yuki Tanaka',
              role: 'Japanese Teacher',
              text: 'I recommend this to all my students. The comprehensive content and UX are excellent.',
              rating: 5,
            },
            {
              name: 'Emma Rodriguez',
              role: 'Career Changer',
              text: 'Used this to prepare for my job interview in Tokyo. It covers everything needed for N5.',
              rating: 5,
            },
          ].map((testimonial, idx) => (
            <div key={idx} className="card p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-gold text-lg">★</span>
                ))}
              </div>
              <p className="text-slate mb-4 italic">&ldquo;{testimonial.text}&rdquo;</p>
              <div>
                <p className="font-semibold text-ink">{testimonial.name}</p>
                <p className="text-sm text-muted">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          PRICING / CTA
          ================================================================ */}
      <section className="section section-accent">
        <div className="section-header">
          <h2>100% Free, Forever</h2>
          <p>No subscriptions, no hidden fees, no paywalls</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="card-elevated p-12 text-center">
            <h3 className="text-3xl font-bold text-ink mb-4">
              Complete Japanese Learning Studio
            </h3>
            <p className="text-lg text-slate mb-8">
              Everything needed to master JLPT N5 level Japanese
            </p>

            <div className="mb-8">
              <p className="text-4xl font-bold text-gradient mb-2">$0</p>
              <p className="text-slate">Forever free • Open source • No ads</p>
            </div>

            <Link href="/app" className="btn btn-primary btn-large w-full justify-center mb-4">
              Start Learning Now
            </Link>

            <p className="text-sm text-muted">
              💾 Your progress is saved locally on your device
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="bg-navy text-paper py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded bg-gradient-warm flex items-center justify-center text-white font-display text-lg">
                  日
                </div>
                <strong>Nihongo Vibes</strong>
              </div>
              <p className="text-sm text-muted">
                Free JLPT N5 Japanese learning platform powered by AI and spaced repetition.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-ivory">Product</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link href="/app" className="hover:text-sakura">Learning Studio</Link></li>
                <li><Link href="#" className="hover:text-sakura">Features</Link></li>
                <li><Link href="#" className="hover:text-sakura">Roadmap</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-ivory">Community</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="hover:text-sakura">GitHub</a></li>
                <li><a href="#" className="hover:text-sakura">Discussions</a></li>
                <li><a href="#" className="hover:text-sakura">Twitter</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-ivory">Legal</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link href="#" className="hover:text-sakura">Privacy</Link></li>
                <li><Link href="#" className="hover:text-sakura">Terms</Link></li>
                <li><Link href="#" className="hover:text-sakura">License</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate pt-8 text-center text-sm text-muted">
            <p>© 2026 Nihongo Vibes. All rights reserved. • Made with ❤️ for Japanese learners</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
