const variants = {
  primary: 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 active:bg-blue-700',
  secondary: 'bg-slate-100 text-slate-700 active:bg-slate-200',
  outline: 'bg-white text-slate-700 border border-slate-200 active:bg-slate-50',
  danger: 'bg-red-50 text-red-600 border border-red-100 active:bg-red-100',
  success: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 active:bg-emerald-700',
  ghost: 'bg-transparent text-slate-600 active:bg-slate-100',
};

const sizes = {
  sm: 'px-3 py-2 text-xs font-semibold rounded-xl',
  md: 'px-4 py-3 text-sm font-semibold rounded-xl',
  lg: 'px-5 py-3.5 text-sm font-semibold rounded-2xl',
  icon: 'p-2.5 rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 ${
        variants[variant]
      } ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
