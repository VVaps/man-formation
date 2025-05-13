// pages/verify-email.jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { FiCheckCircle, FiAlertCircle, FiArrowLeft, FiClock } from 'react-icons/fi';

export default function VerifyEmail() {
  const router = useRouter();
  const { token } = router.query;
  const [verified, setVerified] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const res = await fetch(
          `/api/verify-email?token=${encodeURIComponent(token)}`
        );

        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(text || 'Verification failed');
        }

        const data = await res.json();
        if (data.verified) {
          setVerified(true);
        } else {
          setVerified(false);
          setError(data.error || 'Erreur lors de la vérification');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setVerified(false);
        setError(
          err.message.includes('<!DOCTYPE')
            ? 'Lien de vérification invalide'
            : err.message
        );
      }
    };

    verifyEmail();
  }, [token]);

  useEffect(() => {
    if (verified) {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      const redirectTimer = setTimeout(() => {
        router.push('/auth');
      }, 5000);
      return () => {
        clearInterval(timer);
        clearTimeout(redirectTimer);
      };
    }
  }, [verified, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {verified === true ? (
          <>
            <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Email Vérifié avec Succès!
            </h1>
            <p className="text-gray-600 mb-6">
              Votre adresse email a été confirmée avec succès. Vous allez être
              redirigé vers la page de connexion.
            </p>
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <FiClock className="w-5 h-5" />
              <span>Redirection dans {countdown} secondes...</span>
            </div>
            <button
              onClick={() => router.push('/auth')}
              className="mt-6 text-blue-600 hover:text-blue-700 flex items-center justify-center w-full"
            >
              <FiArrowLeft className="mr-2" />
              Aller à la page de connexion maintenant
            </button>
          </>
        ) : verified === false ? (
          <>
            <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Échec de la Vérification
            </h1>
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
              <p className="font-medium">{error}</p>
            </div>
            <ul className="text-sm text-gray-500 space-y-2 text-left mb-6">
              <li>• Le lien a expiré (valide 24h)</li>
              <li>• Lien déjà utilisé</li>
              <li>• Format d&apos;email invalide</li>
            </ul>
            <button
              onClick={() => router.push('/auth')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center w-full"
            >
              <FiArrowLeft className="mr-2" />
              Retour à la page de connexion
            </button>
          </>
        ) : (
          <p className="text-gray-600">Vérification en cours...</p>
        )}
      </div>
    </div>
  );
}
