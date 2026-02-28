import Link from "next/link";
import { Video, Search, Bell, User, Upload } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-youtube-black border-b border-youtube-border z-50 flex items-center px-4">
      <div className="flex items-center gap-4 flex-1">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-youtube-red hover:text-red-600"
        >
          <Video size={32} fill="currentColor" />
          <span className="text-xl font-bold text-white">StreamTube</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-2xl mx-auto">
          <div className="flex">
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-youtube-dark border border-youtube-border rounded-l-full px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <button className="bg-youtube-darkHover border border-youtube-border border-l-0 rounded-r-full px-6 hover:bg-youtube-border">
              <Search size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        <Link
          href="/studio"
          className="flex items-center gap-2 bg-youtube-red hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium"
        >
          <Upload size={20} />
          <span className="hidden sm:inline">Go Live</span>
        </Link>
        <button className="p-2 hover:bg-youtube-darkHover rounded-full">
          <Bell size={24} className="text-white" />
        </button>
        <button className="p-2 hover:bg-youtube-darkHover rounded-full">
          <User size={24} className="text-white" />
        </button>
      </div>
    </header>
  );
}
