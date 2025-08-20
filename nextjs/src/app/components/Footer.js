import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="bg-dark text-white text-center p-3 mt-auto fw-bold">
      <p className="mb-0">
        © 2025 Travel App. Created by 
        <Link href="https://github.com/Danzigerrr" className="text-white mx-1">
          Danzigerrr
        </Link>
        .
      </p>
    </footer>
  );
}