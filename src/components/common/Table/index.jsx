export default function Table({ children, className = '' }) {
  return (
    <div
      className={`overflow-x-auto rounded-lg border border-gray-200 ${className}`}
    >
      <table className="w-full text-sm text-left text-gray-500">
        {children}
      </table>
    </div>
  );
}
