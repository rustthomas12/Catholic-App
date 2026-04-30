import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function ExaminationPage() {
  const { t } = useTranslation('premium')
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Examination of Conscience | Communio'
  }, [])

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        {/* Header */}
        <div className="bg-navy px-4 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="text-white/70 hover:text-white p-1 flex items-center transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-white font-bold text-xl">{t('examination_title')}</h1>
          </div>
          <p className="text-gray-300 text-sm ml-8">{t('examination_subtitle')}</p>
        </div>

        <div className="px-4 pt-10 flex flex-col items-center gap-4 text-center">
          <BookOpenIcon className="w-16 h-16 text-gray-200" />
          <p className="text-navy font-semibold text-lg">Coming Soon</p>
          <p className="text-gray-400 text-sm max-w-xs">
            A guided examination of conscience to help you prepare for a good Confession is on the way.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-sm font-semibold text-navy hover:underline"
          >
            ← Go back
          </button>
        </div>

      </div>
    </div>
  )
}
