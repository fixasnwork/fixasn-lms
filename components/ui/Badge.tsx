interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';
  className?: string;
}

export default function Badge({ children, color = 'blue', className = '' }: BadgeProps) {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
    green: { bg: 'bg-green-50', text: 'text-green-700' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-700' },
    red: { bg: 'bg-red-50', text: 'text-red-700' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700' },
  }[color];

  return (
    <span
      className={`
        inline-block px-2.5 py-0.5 rounded-full text-xs font-bold
        font-['Montserrat',sans-serif]
        ${colors.bg} ${colors.text}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
