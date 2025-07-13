"use client";

export default function TestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-black mb-4">Test Page</h1>
        <p className="text-xl text-gray-600">If you can see this, the app is working!</p>
        <div className="mt-8 p-4 bg-blue-100 rounded-lg">
          <p className="text-blue-800">App is functional - the issue might be with auth or routing</p>
        </div>
      </div>
    </div>
  );
}
