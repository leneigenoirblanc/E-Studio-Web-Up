import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { THEME_CLASSES } from '../../theme/ThemeConstants';

export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'outline' 
  | 'ghost' 
  | 'danger' 
  | 'success' 
  | 'dark';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Spatial math: horizontal padding ~2x vertical padding
    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'text-xs px-2.5 py-1 min-h-[28px] gap-1.5 rounded',
      sm: 'text-xs px-3 py-1.5 min-h-[34px] gap-1.5 rounded-md font-medium',
      md: 'text-sm px-4 py-2 min-h-[40px] gap-2 rounded-lg font-medium',
      lg: 'text-base px-5 py-2.5 min-h-[46px] gap-2.5 rounded-lg font-semibold',
    };

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs border border-transparent disabled:bg-blue-300',
      secondary:
        'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 border border-slate-200/80 disabled:opacity-50',
      outline:
        'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 shadow-2xs disabled:bg-slate-50 disabled:text-slate-400',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 border border-transparent disabled:opacity-40',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs border border-transparent disabled:bg-rose-300',
      success:
        'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs border border-transparent disabled:bg-emerald-300',
      dark:
        'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 border border-slate-800 disabled:opacity-50',
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-sans tracking-tight cursor-pointer select-none',
          'transition-all duration-150 ease-in-out',
          THEME_CLASSES.focusRing,
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && 'w-full',
          isDisabled && 'cursor-not-allowed opacity-60 shadow-none pointer-events-none',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-0.5 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="truncate">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>}
            <span className="truncate">{children}</span>
            {rightIcon && <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
