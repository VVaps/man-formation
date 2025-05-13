import Link from "next/link";

// pages/unauthorized.jsx
export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <h1 className="text-4xl font-bold text-red-500 mb-4">401 - Accès refusé</h1>
      <p className="text-lg text-gray-700 mb-6">
        Vous n&apos;avez pas la permission de consulter cette page.
      </p>
      <Link 
        href="/" 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
