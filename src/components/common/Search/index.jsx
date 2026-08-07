import { Search as SearchIcon } from 'lucide-react';
import Input from '../Input';

export default function Search({ placeholder = 'Search...' }) {
  return (
    <div className="relative w-full max-w-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <SearchIcon className="h-4 w-4 text-gray-400" />
      </div>
      <Input type="text" placeholder={placeholder} className="pl-10" />
    </div>
  );
}
