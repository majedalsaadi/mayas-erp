'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  clickable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, clickable = false, padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-xl border border-gray-100 shadow-sm',
          hoverable && 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
          clickable && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
          {
            'p-0': padding === 'none',
            'p-4': padding === 'sm',
            'p-6': padding === 'md',
            'p-8': padding === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { bordered?: boolean }
>(({ className, bordered = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1.5', bordered && 'pb-4 border-b border-gray-100', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }
>(({ className, as: Component = 'h3', ...props }, ref) => (
  <Component
    ref={ref}
    className={cn('text-lg font-semibold text-gray-900 leading-none', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-gray-500', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { padding?: boolean }
>(({ className, padding = false, ...props }, ref) => (
  <div ref={ref} className={cn(padding && 'pt-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { bordered?: boolean }
>(({ className, bordered = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center gap-3',
      bordered && 'pt-4 mt-4 border-t border-gray-100',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Stat Card - بطاقة إحصائية
interface StatCardProps extends Omit<CardProps, 'children'> {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    label?: string;
  };
  icon?: React.ReactNode;
  iconBg?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, change, icon, iconBg = 'bg-blue-100 text-blue-600', className, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {change && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-sm',
                  change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change.type === 'increase' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                  </svg>
                )}
                <span>{Math.abs(change.value)}%</span>
                {change.label && <span className="text-gray-500 mr-1">{change.label}</span>}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn('p-3 rounded-xl', iconBg)}>
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }
);
StatCard.displayName = 'StatCard';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard };
