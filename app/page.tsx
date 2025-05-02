// app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to Voice Session Viewer</h1>
      <p className="text-gray-600">
        Your Firebase test page is {' '}
        <Link 
          href="/test-firebase"
          className="text-blue-500 hover:underline"
        >
          here
        </Link>
      </p>
    </div>
  );
}