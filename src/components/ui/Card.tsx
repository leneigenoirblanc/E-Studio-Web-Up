import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { ThemeConstants, THEME_SHADOW_CLASSES, THEME_SPACING_CLASSES } from '../../theme/ThemeConstants';

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'flat' | 'interactive';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  noPadding?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', noPadding = false, children, ...props }, ref) => {
    const variantStyles: Record<CardVariant, string> = {
      default: cn('bg-white border border-slate-200/90 text-slate-900', THEME_SHADOW_CLASSES.xs),
      bordered: 'bg-white border border-slate-200 text-slate-900',
      elevated: cn('bg-white border border-slate-200/80 text-slate-900', THEME_SHADOW_CLASSES.md),
      flat: 'bg-slate-50 border border-slate-100 text-slate-900',
      interactive: cn(
        'bg-white border border-slate-200/90 hover:border-slate-300 transition-all duration-200 cursor-pointer text-slate-900',
        THEME_SHADOW_CLASSES.xs,
        'hover:shadow-md'
      ),
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl overflow-hidden',
          variantStyles[variant],
          !noPadding && THEME_SPACING_CLASSES.cardPadding,
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

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4 border-b border-slate-100', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug', className)}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-xs sm:text-sm text-slate-500 font-normal leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('pt-4 text-sm text-slate-700', className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between pt-4 mt-4 border-t border-slate-100 gap-3', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export default Card;
