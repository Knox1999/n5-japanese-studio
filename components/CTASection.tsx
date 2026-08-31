'use client';

import React from 'react';
import Button from './Button';

interface CTASectionProps {
  title: string;
  description: string;
  primaryText?: string;
  secondaryText?: string;
  primaryHref?: string;
  secondaryHref?: string;
  variant?: 'default' | 'highlight';
}

export default function CTASection({
  title,
  description,
  primaryText = 'Get Started',
  secondaryText = 'Learn More',
  primaryHref = '/app',
  secondaryHref = '#',
  variant = 'default',
}: CTASectionProps) {
  const bgClass = variant === 'highlight' ? 'bg-gradient-warm' : 'bg-navy';
  const textColor = variant === 'highlight' ? 'text-white' : 'text-ivory';

  return (
    <section className={`${bgClass} py-16 px-4 rounded-2xl shadow-xl`}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className={`text-3xl md:text-4xl font-bold ${textColor} mb-4`}>
          {title}
        </h2>
        <p className={`text-lg ${variant === 'highlight' ? 'text-white/90' : 'text-ivory/80'} mb-8`}>
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            href={primaryHref}
            variant={variant === 'highlight' ? 'secondary' : 'primary'}
            size="large"
          >
            {primaryText}
          </Button>
          <Button
            href={secondaryHref}
            variant={variant === 'highlight' ? 'outline' : 'ghost'}
            size="large"
          >
            {secondaryText}
          </Button>
        </div>
      </div>
    </section>
  );
}
