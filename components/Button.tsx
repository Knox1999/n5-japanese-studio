'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps={
  children:ReactNode;
  href?:string;
  variant?:'primary'|'secondary'|'outline'|'ghost';
  size?:'small'|'medium'|'large';
  className?:string;
}&Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'>;

export default function Button({
  children,
  href,
  variant='primary',
  size='medium',
  className='',
  type='button',
  ...buttonProps
}:ButtonProps){
  const classes=`btn btn-${variant} btn-${size} ${className}`.trim();
  if(href){
    return <Link href={href} className={classes}>{children}</Link>;
  }
  return <button type={type} className={classes} {...buttonProps}>{children}</button>;
}
