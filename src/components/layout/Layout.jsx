import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />{' '}
          {/* This renders whatever page component matches the route */}
        </main>
        <Footer />
      </div>
    </div>
  );
}
