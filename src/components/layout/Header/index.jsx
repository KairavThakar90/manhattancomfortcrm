export default function Header() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="font-semibold text-gray-700 text-lg">
        Manhattan Comfort CRM
      </div>
      <div className="flex items-center space-x-4">
        {/* Placeholder for User Profile / Notifications */}
        <div className="text-sm text-gray-500 hover:text-gray-900 cursor-pointer">
          Notifications
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
          A
        </div>
      </div>
    </header>
  );
}
