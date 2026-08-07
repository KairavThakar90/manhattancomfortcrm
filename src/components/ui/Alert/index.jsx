import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export default function Alert({
  title,
  description,
  variant = 'info',
  className = '',
}) {
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-400',
      text: 'text-blue-800',
      icon: <Info className="h-5 w-5 text-blue-400" />,
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-400',
      text: 'text-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-400" />,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-400',
      text: 'text-yellow-800',
      icon: <AlertCircle className="h-5 w-5 text-yellow-400" />,
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-400',
      text: 'text-red-800',
      icon: <XCircle className="h-5 w-5 text-red-400" />,
    },
  };

  const style = variants[variant] || variants.info;

  return (
    <div
      className={`rounded-md border p-4 ${style.bg} ${style.border} ${className}`}
    >
      <div className="flex">
        <div className="flex-shrink-0">{style.icon}</div>
        <div className="ml-3">
          {title && (
            <h3 className={`text-sm font-medium ${style.text}`}>{title}</h3>
          )}
          {description && (
            <div className={`mt-2 text-sm ${style.text}`}>
              <p>{description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
