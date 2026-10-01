import React, { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/cn';
import { THEME_CLASSES } from '../../theme/ThemeConstants';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      label,
      helperText,
      error = false,
      errorMessage,
      leftIcon,
      rightIcon,
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = error || Boolean(errorMessage);

    return (
      <div className={cn('w-full flex flex-col space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-slate-700 tracking-tight flex items-center justify-between"
          >
            <span>
              {label}
              {required && <span className="text-rose-500 ml-0.5">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={cn(
              'w-full bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-lg border',
              'px-3.5 py-2 min-h-[38px] transition-all duration-150',
              hasError
                ? 'border-rose-400 text-rose-900 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              disabled && 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed shadow-none',
              THEME_CLASSES.focusRing,
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {hasError && errorMessage ? (
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 leading-normal">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
