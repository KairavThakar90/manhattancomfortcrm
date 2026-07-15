export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r h-full flex flex-col">
      <div className="p-4 font-bold text-xl border-b">CRM Menu</div>
      <nav className="flex-1 p-4 space-y-2">
        <div className="hover:bg-gray-100 p-2 rounded cursor-pointer">
          Dashboard
        </div>
        <div className="hover:bg-gray-100 p-2 rounded cursor-pointer">
          Customers
        </div>
        <div className="hover:bg-gray-100 p-2 rounded cursor-pointer">
          Purchase Orders
        </div>
        <div className="hover:bg-gray-100 p-2 rounded cursor-pointer">
          Products
        </div>
        <div className="hover:bg-gray-100 p-2 rounded cursor-pointer">
          Settings
        </div>
      </nav>
    </aside>
  );
}
