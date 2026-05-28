import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, type = 'text', className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="text-xs font-semibold text-brand-text-secondary tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full px-4 py-2.5 rounded-lg border text-sm transition-all duration-200
              placeholder:text-brand-text-muted/60
              focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary
              disabled:bg-brand-bg disabled:cursor-not-allowed
              ${error ? 'border-brand-danger focus:ring-brand-danger/20 focus:border-brand-danger' : 'border-brand-border'}
              ${isPassword ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text-secondary transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-brand-danger font-medium mt-0.5">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
