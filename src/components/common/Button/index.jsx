export default function Button({ children, className = '', ...props }) {
  return (
    <button
      className={`rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
