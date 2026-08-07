export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="text-lg font-semibold text-gray-700">
        Manhattan Comfort CRM
      </div>
      <div className="flex items-center space-x-4">
        {/* Placeholder for User Profile / Notifications */}
        <div className="cursor-pointer text-sm text-gray-500 hover:text-gray-900">
          Notifications
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
