export default function Footer() {
  return (
    <footer className="h-12 bg-white border-t flex items-center justify-center text-sm text-gray-500">
      &copy; {new Date().getFullYear()} Manhattan Comfort. All rights reserved.
    </footer>
  );
}
