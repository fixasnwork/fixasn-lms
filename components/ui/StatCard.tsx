import Card from './Card';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
  className?: string;
}

export default function StatCard({ icon, label, value, color = '#1B3A6B', sub, className = '' }: StatCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-['Montserrat',sans-serif] text-xs text-gray-400 mb-1.5 font-semibold">
            {label}
          </p>
          <p 
            className="font-['Montserrat',sans-serif] text-3xl font-black m-0"
            style={{ color }}
          >
            {value}
          </p>
          {sub && (
            <p className="font-['Montserrat',sans-serif] text-xs text-green-600 mt-1 font-bold">
              {sub}
            </p>
          )}
        </div>
        <div 
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: `${color}18` }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
