import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiSend, FiClock, FiAlertTriangle, FiUsers, FiType, FiCalendar } from 'react-icons/fi';
import Loader from '../components/loading';

export default function StartCampaign() {
  const router = useRouter();
  const [form, setForm] = useState({
    emails: '',
    type: 'delivery',
    schedule: 'immediate',
    datetime: '',
  });
  const [status, setStatus] = useState({ loading: false, message: '', error: '' });
  const [authorized, setAuthorized] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [checked, setChecked] = useState(false);

  // Permission check using the stored token
  useEffect(() => {
    const verifyPermission = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
        return;
      }

      try {
        const res = await fetch('/api/check-campaign-access', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAuthorized(!!data.can_start_campaign);
      } catch (error) {
        console.error('Permission check failed:', error);
        setAuthorized(false);
      } finally {
        setChecked(true);
      }
    };

    verifyPermission();
  }, [router]);

  // Show a loading spinner until permission check is complete
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!authorized) {
    router.push('/unauthorized');
    return null;
  }

  const validateEmails = (emails) => {
    const emailList = emails.split(',').map(e => e.trim());
    const valid = emailList.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    return {
      valid,
      count: emailList.length,
      invalidCount: emailList.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).length
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateEmails(form.emails);
    
    if (!validation.valid) {
      setStatus({
        error: `${validation.invalidCount} email(s) invalide(s)`,
        message: '',
        loading: false
      });
      return;
    }

    setShowConfirm(true);
  };

  const confirmLaunch = async () => {
    setStatus({ loading: true, message: '', error: '' });
    setShowConfirm(false);
  
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatus({ error: 'Vous devez être connecté pour lancer une campagne.', message: '', loading: false });
        return;
      }
  
      const res = await fetch('/api/campaign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentEmails: form.emails.split(',').map(e => e.trim()),
          campaignType: form.type,
          schedule: form.schedule,
          scheduledTime: form.datetime
        })
      });
  
      const data = await res.json();
      if (res.ok) {
        setStatus({
          message: `Campagne lancée ! ID: ${data.campaignId}`,
          error: '',
          loading: false
        });
        setForm({ emails: '', type: 'delivery', schedule: 'immediate', datetime: '' });
  
        // Log the campaign action
        await fetch('/api/log-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'campaign',
            details: { campaignId: data.campaignId }
          })
        });
      } else {
        setStatus({ error: data.message || 'Erreur de lancement', message: '', loading: false });
      }
    } catch (err) {
      setStatus({ error: 'Erreur de connexion', message: '', loading: false });
    }
  };
  

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center">
            <FiSend className="mr-3 text-blue-600" />
            Nouvelle Campagne
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Configurez et planifiez vos simulations de phishing éducatives
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FiUsers className="inline mr-2 text-gray-500" />
                Participants
              </label>
              <textarea
                value={form.emails}
                onChange={(e) => setForm({ ...form, emails: e.target.value })}
                placeholder="emails@etablissement.com, autre@email.org..."
                rows="4"
                className={`w-full p-3 border rounded-lg focus:ring-2 ${
                  status.error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              <div className="mt-2 text-sm text-gray-500">
                {form.emails && `${validateEmails(form.emails).count} email(s) saisi(s)`}
              </div>
            </div>

            {/* Campaign Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FiType className="inline mr-2 text-gray-500" />
                Type de Simulation
              </label>
              <div className="grid md:grid-cols-3 gap-4">
                {['delivery', 'bank', 'other'].map((typeOption) => (
                  <button
                    key={typeOption}
                    type="button"
                    onClick={() => setForm({ ...form, type: typeOption })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      form.type === typeOption 
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium">
                      {typeOption === 'delivery' && 'Livraison (DPD)'}
                      {typeOption === 'bank' && 'Banque (Revolut)'}
                      {typeOption === 'other' && 'Autre'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {typeOption === 'delivery' && 'Simulation de suivi de colis'}
                      {typeOption === 'bank' && 'Simulation bancaire'}
                      {typeOption === 'other' && 'Scénario personnalisé'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FiClock className="inline mr-2 text-gray-500" />
                Planification
              </label>
              <div className="space-y-4">
                <div className="flex gap-4">
                  {['immediate', 'scheduled'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setForm({ ...form, schedule: option })}
                      className={`px-6 py-3 rounded-lg flex items-center ${
                        form.schedule === option
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option === 'immediate' ? 'Immédiat' : 'Programmé'}
                    </button>
                  ))}
                </div>

                {form.schedule === 'scheduled' && (
                  <div className="flex items-center space-x-4">
                    <FiCalendar className="text-gray-500" />
                    <input
                      type="datetime-local"
                      value={form.datetime}
                      onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                      className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status Messages */}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status.loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              {status.loading ? (
                <Loader className="h-5 w-5" />
              ) : (
                <>
                  <FiSend className="mr-2" />
                  Lancer la Campagne
                </>
              )}
            </button>
          </form>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="text-center mb-6">
                <FiAlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
                <h3 className="text-xl font-bold mt-4">Confirmer le Lancement</h3>
                <p className="mt-2 text-gray-600">
                  Vous êtes sur le point d&apos;envoyer {validateEmails(form.emails).count} simulations.
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
                  onClick={confirmLaunch}
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
            <strong>Simulation pédagogique :</strong> Ces campagnes n&apos;envoient pas de vrais emails
            et servent uniquement à des fins de formation à la sécurité.
          </div>
        </div>
      </div>
    </div>
  );
}
