import { Loader2 } from 'lucide-react';

export default function Loader({ className = '' }) {
  return (
    <Loader2 className={`w-6 h-6 animate-spin text-indigo-600 ${className}`} />
  );
}
