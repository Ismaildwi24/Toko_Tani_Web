import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'text';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-5 py-2.5';
  
  const variants = {
    primary: 'bg-brand-primary hover:bg-brand-primary-hover text-white focus:ring-brand-primary',
    secondary: 'bg-brand-primary-light hover:bg-brand-primary-light/80 text-brand-primary focus:ring-brand-primary',
    outline: 'border border-brand-primary text-brand-primary hover:bg-brand-primary-light focus:ring-brand-primary bg-transparent',
    danger: 'bg-brand-danger hover:bg-red-700 text-white focus:ring-brand-danger',
    text: 'text-brand-primary hover:underline bg-transparent p-0 focus:ring-0 focus:ring-offset-0',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};
