export default function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-white">
      <div className="border-b p-4 text-xl font-bold">CRM Menu</div>
      <nav className="flex-1 space-y-2 p-4">
        <div className="cursor-pointer rounded p-2 hover:bg-gray-100">
          Dashboard
        </div>
        <div className="cursor-pointer rounded p-2 hover:bg-gray-100">
          Customers
        </div>
        <div className="cursor-pointer rounded p-2 hover:bg-gray-100">
          Purchase Orders
        </div>
        <div className="cursor-pointer rounded p-2 hover:bg-gray-100">
          Products
        </div>
        <div className="cursor-pointer rounded p-2 hover:bg-gray-100">
          Settings
        </div>
      </nav>
    </aside>
  );
}
