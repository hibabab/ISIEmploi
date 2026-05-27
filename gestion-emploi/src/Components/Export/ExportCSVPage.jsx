// src/pages/Export/ExportCSVPage.jsx
import React, { useState } from 'react';
import { exportPedagogieCSV }  from '../../Services/exportPedagogie';
import { exportSallesToCSV }   from '../../Services/exportSalleService';
import { exportEmploiToCSV }   from '../../Services/exportEmploiService';

// ─── Configuration des exports ────────────────────────────────────────────────

const EXPORT_CONFIGS = [
  {
    key: 'pedagogie',
    title: 'Template Pédagogie',
    description: 'Exporte formations, parcours, unités et matières au format XLS.',
    icon: '',
    label: 'Exporter',
    handler: exportPedagogieCSV,
    formatResult: (result) =>
      result.success
        ? { success: true,  message: `✅ ${result.count} lignes exportées → Téléchargements/${result.filename}` }
        : { success: false, message: `❌ ${result.error}` },
  },
  {
    key: 'salles',
    title: 'Salles',
    description: 'Exporte la liste des salles avec capacités et types au format CSV.',
    icon: '',
    label: 'Exporter',
    handler: exportSallesToCSV,
    formatResult: (result) =>
      result.cancelled
        ? null
        : result.success
        ? { success: true,  message: `✅ ${result.exportedCount} salles exportées` }
        : { success: false, message: `❌ ${result.error}` },
  },
  {
    key: 'emploi',
    title: 'Emploi du temps',
    description:
      'Exporte toutes les séances au format CSV compatible avec la plateforme d\'import. ' +
      'Les séances planifiées à une date précise sont incluses uniquement si elles tombent dans la semaine suivante.',
    icon: '',
    label: 'Exporter',
    handler: exportEmploiToCSV,
    formatResult: (result) => {
      if (!result.success) return { success: false, message: `❌ ${result.error}` };
      const { totalRows, fixedCount, plannedCount, weekRange, filename } = result;
      const lines = [
        `✅ ${totalRows} lignes exportées → ${filename}`,
        `   • ${fixedCount} séances fixes`,
        plannedCount > 0
          ? `   • ${plannedCount} séances planifiées (semaine du ${weekRange.from} au ${weekRange.to})`
          : `   • Aucune séance planifiée pour la semaine prochaine`,
      ];
      return { success: true, message: lines.join('\n') };
    },
  },
];

// ─── Composant carte ──────────────────────────────────────────────────────────

const ExportCard = ({ config }) => {
  const [status, setStatus]       = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);
    setStatus(null);
    try {
      const result    = await config.handler();
      const formatted = config.formatResult(result);
      if (formatted) {
        setStatus(formatted);
        if (formatted.success) setTimeout(() => setStatus(null), 10_000);
      }
    } catch (e) {
      setStatus({ success: false, message: `❌ ${e.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col justify-between">
      <div>
        <div className="text-3xl mb-2">{config.icon}</div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#237AFF' }}>{config.title}</h2>
        <p className="text-xs text-gray-500 mb-4">{config.description}</p>
      </div>

      <div>
        <button
          onClick={handleClick}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer border-blue-300 hover:border-blue-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isExporting ? ' Export en cours...' : ` ${config.label}`}
        </button>

        {status && (
          <div
            className={`mt-2 p-2 rounded text-xs whitespace-pre-line ${
              status.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

const ExportCSVPage = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="mb-8">
      <h1 className="text-2xl font-bold mb-3" style={{ color: '#237AFF' }}>
        Export des Données
      </h1>
      <p className="text-gray-600">
        Les fichiers sont sauvegardés dans votre dossier <strong>Téléchargements</strong>
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {EXPORT_CONFIGS.map((config) => (
        <ExportCard key={config.key} config={config} />
      ))}
    </div>
  </div>
);

export default ExportCSVPage;