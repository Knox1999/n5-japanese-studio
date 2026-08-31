'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface HeaderProps {
  variant?: 'light' | 'dark';
  sticky?: boolean;
}

export default function Header({ sticky = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Modules', href: '#modules' },
    { label: 'Testimonials', href: '#testimonials' },
  ];

  return (
    <header className={`header ${sticky ? 'sticky top-0 z-40' : ''} bg-white border-b border-mist`}>
      <div className="header-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo & Brand */}
        <Link href="/" className="brand">
          <div className="w-10 h-10 rounded-lg bg-gradient-warm flex items-center justify-center text-white font-display text-xl">
            日
          </div>
          <div>
            <strong className="text-ink">Nihongo Vibes</strong>
            <span className="text-sakura text-xs font-bold block">N5 Studio</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink font-medium hover:text-sakura transition-colors relative group"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sakura group-hover:w-full transition-all duration-300"></span>
            </Link>
          ))}
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <Link href="/app" className="hidden sm:block btn btn-primary">
            Start Learning
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-ivory transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-ivory border-t border-mist animate-fadeInDown">
          <nav className="flex flex-col gap-0 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-3 text-ink font-medium hover:text-sakura hover:bg-paper rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/app"
              className="mt-4 px-4 py-3 btn btn-primary w-full text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start Learning
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
