function Footer() {
  return (
    <footer className=" rounded-xl border-t border-gray-700 bg-[#1c1917] ml-30 mr-30 px-10 py-8 text-white">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
       

        <div className="flex gap-6 text-sm text-gray-400">
          <a href="/" className="hover:text-white">
            Home
          </a>
          <a href="/about" className="hover:text-white">
            About
          </a>
          <a href="/contact" className="hover:text-white">
            Contact
          </a>
        </div>
         
          
          <p className="mt-2 text-sm text-gray-400">
            Schedule your emails, achieve your goals.
          
          </p>

          <div className="mt-8 border-t border-gray-700 pt-5 text-center text-sm text-gray-400">
            © 2026 ReachInbox Scheduler • Email Scheduler. All rights reserved.
          </div>
      </div>

      
    </footer>
  );
}

export default Footer;