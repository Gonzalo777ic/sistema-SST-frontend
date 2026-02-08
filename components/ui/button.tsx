import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Se añade 'ghost' a los tipos permitidos
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-dark',
      secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
      danger: 'bg-danger text-white hover:bg-danger-light',
      outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
      // Nueva variante sin fondo sólido ni bordes
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 shadow-none border-none',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';