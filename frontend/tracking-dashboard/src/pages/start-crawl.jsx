import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiGlobe, FiLink, FiAlertTriangle, FiLoader } from 'react-icons/fi';
import Loader from '../components/loading';

export default function StartCrawl() {
  const router = useRouter();
  const [form, setForm] = useState({ url: '' });
  const [status, setStatus] = useState({ loading: false, message: '', error: '' });
  const [result, setResult] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const verifyPermission = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
        return;
      }

      try {
        const res = await fetch('/api/check-crawl-access', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAuthorized(!!data.can_start_crawl);
      } catch (error) {
        console.error('Permission check failed:', error);
        setAuthorized(false);
      } finally {
        setChecked(true);
      }
    };

    verifyPermission();
  }, [router]);

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateUrl(form.url)) {
      setStatus({ error: 'URL invalide', message: '', loading: false });
      return;
    }

    setShowConfirm(true);
  };

  const confirmCrawl = async () => {
    setStatus({ loading: true, message: '', error: '' });
    setShowConfirm(false);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:5001/api/start-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ target_url: form.url }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data.site_url);
        setStatus({
          message: `Crawl initié avec succès: ${data.status}`,
          error: '',
          loading: false
        });
        setForm({ url: '' });

        // Log the crawl action
        await fetch('/api/log-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'crawl',
            details: { siteUrl: form.url }
          })
        });
      } else {
        setStatus({ error: data.error || 'Erreur inconnue', message: '', loading: false });
      }
    } catch (error) {
      setStatus({ error: 'Erreur de connexion', message: '', loading: false });
    }
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="h-12 w-12 text-blue-600" />
      </div>
    );
  }

  if (!authorized) {
    router.push('/unauthorized');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center">
            <FiGlobe className="mr-3 text-blue-600" />
            Analyse de Site Web
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Démarrez une exploration approfondie d&apos;un site web pour analyser sa structure et son contenu
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FiLink className="inline mr-2 text-gray-500" />
                URL à analyser
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ url: e.target.value })}
                placeholder="https://exemple.com"
                className={`w-full p-3 border rounded-lg focus:ring-2 ${status.error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                pattern="https?://.+"
                required
              />
              <div className="mt-2 text-sm text-gray-500">
                {form.url && (
                  validateUrl(form.url) ?
                    'URL valide' :
                    'URL doit commencer par http:// ou https://'
                )}
              </div>
            </div>

            {status.error && (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
                <FiAlertTriangle className="mr-3" />
                {status.error}
              </div>
            )}

            {status.message && (
              <div className="p-4 bg-green-100 text-green-700 rounded-lg">
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={status.loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              {status.loading ? (
                <FiLoader className="animate-spin h-5 w-5" />
              ) : (
                <>
                  <FiGlobe className="mr-2" />
                  Démarrer l&apos;analyse
                </>
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <a
                href={result}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                <FiLink className="mr-2" />
                Accéder aux résultats de l&apos;analyse
              </a>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <FiAlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-bold mt-4">Confirmer l&apos;analyse</h3>
                <p className="mt-2 text-gray-600">
                  Vous êtes sur le point d&apos;analyser le site :<br />
                  <span className="font-mono text-sm">{form.url}</span>
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmCrawl}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 rounded-lg text-yellow-700 flex items-center">
          <FiAlertTriangle className="mr-3 flex-shrink-0" />
          <div>
            <strong>Note importante :</strong> Cette analyse respecte les directives robots.txt et n&apos;effectue pas de requêtes intensives vers les serveurs cibles.
          </div>
        </div>
      </div>
    </div>
  );
}
