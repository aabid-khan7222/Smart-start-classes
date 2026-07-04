export default function Card({ children, className = '', onClick, padding = true }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] ${
        padding ? 'p-4' : ''
      } ${onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
