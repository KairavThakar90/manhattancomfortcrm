export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${className}`}
      {...props}
    />
  );
}
