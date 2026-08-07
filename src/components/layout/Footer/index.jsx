export default function Footer() {
  return (
    <footer className="flex h-12 items-center justify-center border-t bg-white text-sm text-gray-500">
      &copy; {new Date().getFullYear()} Manhattan Comfort. All rights reserved.
    </footer>
  );
}
