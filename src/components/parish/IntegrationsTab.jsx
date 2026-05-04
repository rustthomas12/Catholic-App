import { useState, useEffect } from 'react'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { toast } from '../shared/Toast'
import LoadingSpinner from '../shared/LoadingSpinner'

const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook Page',
    description: 'Auto-post every announcement to your parish Facebook page.',
    icon: '📘',
    authType: 'oauth',
  },
  {
    id: 'flocknote',
    name: 'Flocknote',
    description: 'Send every announcement as a Flocknote email to your list.',
    icon: '✉️',
    authType: 'api_key',
    fields: [
      { key: 'api_key',    label: 'API Key',            type: 'password' },
      { key: 'network_id', label: 'Network ID',          type: 'text' },
      { key: 'group_id',   label: 'Group ID (optional)', type: 'text' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Share announcements with images to Instagram.',
    icon: '📷',
    authType: 'oauth',
    note: 'Only posts with images are shared. Requires a Facebook Business account.',
  },
  {
    id: 'google_business',
    name: 'Google Business',
    description: 'Post announcements and keep your Google listing active.',
    icon: '🔍',
    authType: 'oauth',
  },
  {
    id: 'website_webhook',
    name: 'Parish Website',
    description: 'Send posts to your website via webhook (WordPress, eCatholic, etc.)',
    icon: '🌐',
    authType: 'webhook',
    fields: [
      { key: 'webhook_url',    label: 'Webhook URL', type: 'url' },
      { key: 'webhook_secret', label: 'Secret Key',  type: 'password' },
    ],
  },
  {
    id: 'email_webhook',
    name: 'Custom Email / Automation',
    description: 'Send to any email endpoint or automation tool (Make, Zapier, n8n).',
    icon: '📩',
    authType: 'webhook',
    fields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url' },
    ],
  },
]

export default function IntegrationsTab({ parishId }) {
  const { user } = useAuth()
  const [integrations, setIntegrations] = useState({})
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [parishId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    setLoading(true)
    const [{ data: intRows }, { data: logRows }] = await Promise.all([
      supabase.from('parish_integrations').select('*').eq('parish_id', parishId),
      supabase
        .from('integration_logs')
        .select('*')
        .eq('parish_id', parishId)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    const map = {}
    for (const row of (intRows ?? [])) map[row.platform] = row
    setIntegrations(map)
    setLogs(logRows ?? [])
    setLoading(false)
  }

  async function handleToggle(platformId, enabled) {
    await supabase
      .from('parish_integrations')
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('parish_id', parishId)
      .eq('platform', platformId)
    setIntegrations(prev => ({
      ...prev,
      [platformId]: { ...prev[platformId], is_enabled: enabled },
    }))
  }

  async function handleDisconnect(platformId) {
    await supabase
      .from('parish_integrations')
      .delete()
      .eq('parish_id', parishId)
      .eq('platform', platformId)
    setIntegrations(prev => {
      const next = { ...prev }
      delete next[platformId]
      return next
    })
    toast.success('Disconnected')
  }

  function handleConnect(platform) {
    if (platform.authType === 'oauth') {
      const params = new URLSearchParams({
        parish_id:     parishId,
        admin_user_id: user.id,
      })
      const popup = window.open(
        `/api/integrations?action=facebook-auth&${params}`,
        'communio_oauth',
        'width=600,height=700,left=200,top=100'
      )

      const onMessage = (e) => {
        if (e.data?.type !== 'INTEGRATION_RESULT' || e.data.platform !== platform.id) return
        window.removeEventListener('message', onMessage)
        if (e.data.result === 'connected') {
          loadAll()
          toast.success(`${platform.name} connected!`)
        } else if (e.data.result === 'select_page') {
          loadAll()
          toast.info('Select your Facebook page below to complete setup.')
        } else if (e.data.result === 'denied') {
          toast.error('Authorization was denied.')
        } else {
          toast.error(`Connection failed: ${e.data.result}`)
        }
      }
      window.addEventListener('message', onMessage)

      // Cleanup if popup is closed without posting a message
      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll)
          window.removeEventListener('message', onMessage)
        }
      }, 500)
    } else {
      setConnectingId(platform.id)
      setFormData({})
    }
  }

  async function handleFormSave(platform) {
    setSaving(true)
    try {
      const endpoint = platform.authType === 'api_key'
        ? '/api/integrations?action=flocknote-connect'
        : '/api/integrations?action=webhook-connect'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parish_id: parishId, platform: platform.id, ...formData }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Connection failed')
      } else {
        toast.success(`${platform.name} connected!`)
        setConnectingId(null)
        await loadAll()
        // Surface auto-generated webhook secret to admin once
        if (data.webhook_secret && !formData.webhook_secret) {
          toast.info(
            `Your secret key: ${data.webhook_secret}  — copy it now, it won't be shown again.`,
            { duration: 15000 }
          )
        }
      }
    } finally {
      setSaving(false)
    }
  }

  async function selectFacebookPage(integration, page) {
    await supabase
      .from('parish_integrations')
      .update({
        access_token: page.access_token,
        config: { page_id: page.id, page_name: page.name },
        is_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)
    await loadAll()
    toast.success(`Connected to ${page.name}`)
  }

  if (loading) return <LoadingSpinner />

  const hasAnyIntegration = Object.keys(integrations).length > 0

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="bg-navy rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <ArrowsRightLeftIcon className="w-5 h-5 text-gold" />
          <h2 className="text-white font-bold text-lg">Integrations</h2>
        </div>
        <p className="text-white/60 text-sm leading-relaxed">
          Connect your parish to other platforms. When you publish an announcement in Communio,
          it automatically distributes to every connected platform — no extra work required.
        </p>
      </div>

      {/* Platform cards */}
      <div className="space-y-3">
        {PLATFORMS.map(platform => {
          const integration = integrations[platform.id]
          const isConnected  = !!integration
          const isEnabled    = integration?.is_enabled !== false
          const hasError     = isConnected && integration.last_error && integration.error_count > 0
          const awaitingPage = integration?.config?.awaiting_page_selection

          return (
            <div
              key={platform.id}
              className={`rounded-2xl border bg-white overflow-hidden ${
                hasError ? 'border-amber-300' :
                isConnected ? 'border-green-200' :
                'border-gray-200'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{platform.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold text-navy text-sm">{platform.name}</h3>
                        {isConnected && !hasError && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Connected{integration.config?.page_name
                              ? ` · ${integration.config.page_name}`
                              : integration.config?.network_name
                                ? ` · ${integration.config.network_name}`
                                : ''}
                          </span>
                        )}
                        {hasError && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            Error — check settings
                          </span>
                        )}
                        {!isConnected && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                            Not connected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{platform.description}</p>
                      {platform.note && (
                        <p className="text-xs text-blue-500 mt-1 italic">{platform.note}</p>
                      )}
                      {isConnected && integration.last_sync_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last synced {formatDistanceToNow(new Date(integration.last_sync_at))} ago
                        </p>
                      )}
                      {hasError && (
                        <p className="text-xs text-amber-600 mt-1 truncate" title={integration.last_error}>
                          {integration.last_error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: controls */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleToggle(platform.id, !isEnabled)}
                          title={isEnabled ? 'Pause distribution' : 'Resume distribution'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            isEnabled ? 'bg-navy' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            isEnabled ? 'translate-x-4' : 'translate-x-1'
                          }`} />
                        </button>
                        <button
                          onClick={() => handleDisconnect(platform.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : connectingId !== platform.id ? (
                      <button
                        onClick={() => handleConnect(platform)}
                        className="text-xs font-semibold px-3 py-1.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
                      >
                        Connect →
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Inline form for API key / webhook platforms */}
                {connectingId === platform.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {platform.fields?.map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-semibold text-navy mb-1">{field.label}</label>
                        <input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={formData[field.key] ?? ''}
                          onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-navy"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleFormSave(platform)}
                        disabled={saving}
                        className="text-xs font-semibold px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-50 transition-colors"
                      >
                        {saving ? 'Connecting…' : 'Save & Connect'}
                      </button>
                      <button
                        onClick={() => setConnectingId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Facebook page selector (when multiple pages) */}
                {awaitingPage && isConnected && (
                  <div className="mt-4 pt-4 border-t border-amber-100">
                    <p className="text-xs font-semibold text-navy mb-2">
                      Select which Facebook page to post to:
                    </p>
                    <div className="space-y-2">
                      {(integration.config.pages ?? []).map(page => (
                        <button
                          key={page.id}
                          onClick={() => selectFacebookPage(integration, page)}
                          className="w-full flex items-center gap-2 text-left px-3 py-2 border border-gray-200 rounded-xl hover:bg-lightbg transition-colors"
                        >
                          <span className="font-medium text-navy text-sm truncate">{page.name}</span>
                          <span className="text-gray-400 text-xs ml-auto flex-shrink-0">Select →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Activity log */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Recent Distribution Activity
          </h3>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3 text-xs">
                <span className={`font-bold flex-shrink-0 ${log.status === 'success' ? 'text-green-500' : 'text-red-400'}`}>
                  {log.status === 'success' ? '✓' : '✗'}
                </span>
                <span className="font-medium text-navy capitalize w-28 flex-shrink-0">
                  {log.platform.replace(/_/g, ' ')}
                </span>
                <span className="text-gray-400 flex-1 truncate">
                  {log.error_message || 'Posted successfully'}
                </span>
                <span className="text-gray-300 flex-shrink-0 whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.created_at))} ago
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyIntegration && logs.length === 0 && (
        <div className="text-center py-10">
          <ArrowsRightLeftIcon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-navy text-sm mb-1">No integrations connected yet</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            Connect a platform above. Your next announcement will distribute automatically.
          </p>
        </div>
      )}
    </div>
  )
}
