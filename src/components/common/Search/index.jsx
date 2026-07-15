import { Search as SearchIcon } from 'lucide-react';
import Input from '../Input';

export default function Search({ placeholder = 'Search...' }) {
  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-4 w-4 text-gray-400" />
      </div>
      <Input type="text" placeholder={placeholder} className="pl-10" />
    </div>
  );
}
