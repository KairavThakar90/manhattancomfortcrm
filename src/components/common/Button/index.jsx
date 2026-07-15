export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`px-4 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
