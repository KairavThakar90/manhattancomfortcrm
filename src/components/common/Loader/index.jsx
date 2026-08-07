import { Loader2 } from 'lucide-react';

export default function Loader({ className = '' }) {
  return (
    <Loader2 className={`h-6 w-6 animate-spin text-indigo-600 ${className}`} />
  );
}
