'use client';

export default function DebugPage() {
  const handleClick = () => {
    console.log('Button clicked!');
    alert('Button works!');
    window.location.href = '/transactions/add';
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-green-400">Debug Page</h1>
        <button
          onClick={handleClick}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-bold text-xl"
          style={{ zIndex: 9999 }}
        >
          Click Me - Test Navigation
        </button>
        <p className="text-gray-400">Si este botón funciona, el problema está en otro lado</p>
      </div>
    </div>
  );
}
