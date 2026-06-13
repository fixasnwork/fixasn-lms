"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?:
    | "primary"
    | "gold"
    | "outline"
    | "danger"
    | "success"
    | "ghost"
    | "white";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  style = {},
}: ButtonProps) {
  const baseStyles = `
    font-bold border-none rounded-lg transition-all duration-180
    ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}
  `;

  const sizeStyles = {
    sm: "text-xs px-3.5 py-1.75",
    md: "text-sm px-5 py-2.5",
    lg: "text-base px-8 py-3.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-gradient-to-br from-brand to-brand-secondary text-white shadow-lg shadow-blue-500/30",
    gold: "bg-gradient-to-br from-[#B8860B] to-[#F5C518] text-white shadow-lg shadow-yellow-500/30",
    outline: "bg-transparent text-brand border-2 border-brand",
    danger: "bg-[#DC2626] text-white",
    success: "bg-[#16A34A] text-white",
    ghost: "bg-transparent text-gray-500 border border-gray-200",
    white: "bg-white text-brand shadow-md shadow-black/12",
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}
