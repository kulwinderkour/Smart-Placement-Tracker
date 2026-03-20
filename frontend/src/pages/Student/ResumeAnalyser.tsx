import { useState } from 'react'
import { aiApi } from '../../api/ai'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import type { ATSResult } from '../../types'

export default function ResumeAnalyser() {
  const [file, setFile]       = useState<File | null>(null)
  const [result, setResult]   = useState<ATSResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleAnalyse = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const res = await aiApi.analyseResume(file)
      setResult(res.data.data)
    } catch {
      setError('Failed to analyse resume. Make sure it is a valid PDF or DOCX.')
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (score: number) =>
    score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Analyser</h1>
      <p className="text-gray-500 mb-8">Upload your resume to get an ATS score and skill analysis</p>

      {/* Upload Area */}
      <Card className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-gray-600 mb-4">Upload your resume (PDF or DOCX, max 5MB)</p>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="resume-upload"
          />
          <label htmlFor="resume-upload">
            <Button variant="secondary" className="cursor-pointer" onClick={() => {}}>
              Choose File
            </Button>
          </label>
          {file && <p className="text-sm text-blue-600 mt-3 font-medium">✅ {file.name}</p>}
        </div>

        {error && <p className="text-red-500 text-sm mt-3 bg-red-50 p-3 rounded-lg">{error}</p>}

        <Button className="mt-4 w-full" onClick={handleAnalyse} loading={loading} disabled={!file}>
          Analyse Resume
        </Button>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* ATS Score */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">ATS Score</h2>
              <span className={`text-4xl font-bold ${scoreColor(result.ats_score)}`}>
                {result.ats_score}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${result.ats_score >= 70 ? 'bg-green-500' : result.ats_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${result.ats_score}%` }}
              />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
              {Object.entries(result.breakdown).map(([key, val]) => (
                <div key={key} className="text-center bg-gray-50 rounded-lg p-3">
                  <div className={`text-lg font-bold ${scoreColor(val)}`}>{val}%</div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">{key.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 Suggestions</h2>
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-yellow-500 mt-0.5">⚠️</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Skills Found */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🛠️ Skills Found ({result.skills.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {result.skills.map((skill, i) => (
                <Badge
                  key={i}
                  label={skill.name}
                  color={skill.category === 'language' ? 'blue' : skill.category === 'framework' ? 'purple' : skill.category === 'tool' ? 'yellow' : 'gray'}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
