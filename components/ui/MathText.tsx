interface MathTextProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function MathText({ text, style = {}, className = '' }: MathTextProps) {
  return (
    <span 
      className={className}
      style={{ lineHeight: 1.7, ...style }}
    >
      {text}
    </span>
  );
}
