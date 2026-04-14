import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts'

const probabilityTable = {
  '-7': { n: 194, p: 51.5 },
  '-6': { n: 31, p: 41.9 },
  '-5': { n: 123, p: 56.9 },
  '-4': { n: 48, p: 52.0 },
  '-3': { n: 151, p: 40.3 },
  '-2': { n: 60, p: 45.0 },
  '-1': { n: 121, p: 43.8 },
  '0': { n: 73, p: 0.0 },
  '1': { n: 135, p: 52.5 },
  '2': { n: 59, p: 50.8 },
  '3': { n: 180, p: 43.8 },
  '4': { n: 57, p: 54.3 },
  '5': { n: 145, p: 56.5 },
  '6': { n: 32, p: 53.1 },
  '7': { n: 224, p: 50.4 }
}

const demoRows = [
  { Datetime: '2026-03-05 10:00', WIN: 0.12, DOL: -0.08, EWZ: 0.25, ITUB4: 0.19, VALE3: 0.11, ITUB_US: 0.17, VALE_US: 0.08, PBR_A: 0.05 },
  { Datetime: '2026-03-05 10:30', WIN: -0.03, DOL: 0.09, EWZ: -0.14, ITUB4: -0.07, VALE3: -0.05, ITUB_US: -0.04, VALE_US: -0.02, PBR_A: -0.01 },
  { Datetime: '2026-03-05 11:00', WIN: 0.09, DOL: -0.04, EWZ: 0.16, ITUB4: 0.08, VALE3: 0.04, ITUB_US: 0.07, VALE_US: 0.03, PBR_A: 0.02 },
  { Datetime: '2026-03-05 11:30', WIN: 0.02, DOL: -0.03, EWZ: 0.06, ITUB4: 0.02, VALE3: 0.01, ITUB_US: 0.03, VALE_US: 0.01, PBR_A: 0.01 },
  { Datetime: '2026-03-05 12:00', WIN: -0.11, DOL: 0.12, EWZ: -0.21, ITUB4: -0.13, VALE3: -0.09, ITUB_US: -0.11, VALE_US: -0.06, PBR_A: -0.03 },
  { Datetime: '2026-03-05 12:30', WIN: 0.15, DOL: -0.06, EWZ: 0.18, ITUB4: 0.10, VALE3: 0.06, ITUB_US: 0.12, VALE_US: 0.04, PBR_A: 0.03 }
]

function sign(v) {
  if (v > 0) return 1
  if (v < 0) return -1
  return 0
}

function calcScore(row) {
  return (
    sign(Number(row.EWZ ?? 0)) +
    sign(Number(row.ITUB4 ?? row.ITAU_B3 ?? 0)) +
    sign(Number(row.VALE3 ?? row.VALE_B3 ?? 0)) +
    sign(Number(row.ITUB_US ?? 0)) +
    sign(Number(row.VALE_US ?? 0)) +
    sign(Number(row.PBR_A ?? 0)) -
    sign(Number(row.DOL ?? 0))
  )
}

function calcSignal(score) {
  if (score >= 4) return 'COMPRA FORTE'
  if (score >= 3) return 'COMPRA'
  if (score <= -4) return 'VENDA FORTE'
  if (score <= -3) return 'VENDA'
  return 'NEUTRO'
}

function pct(v) {
  return `${Number(v).toFixed(1)}%`
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const out = {}
    Object.keys(row).forEach((key) => {
      out[String(key).trim()] = row[key]
    })
    return out
  })
}

function readCsv(text) {
  const wb = XLSX.read(text, { type: 'string' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: 0 })
}

export default function App() {
  const [rows, setRows] = useState(demoRows)
  const [fileName, setFileName] = useState('demo interno')

  const enriched = useMemo(() => {
    return rows.map((row) => {
      const score = calcScore(row)
      const signal = calcSignal(score)
      const p = probabilityTable[String(score)]?.p ?? null
      const n = probabilityTable[String(score)]?.n ?? null
      return { ...row, score, signal, probability: p, occurrences: n }
    })
  }, [rows])

  const latest = enriched[enriched.length - 1]

  const scoreSeries = enriched.map((row, i) => ({
    name: row.Datetime || `Linha ${i + 1}`,
    score: row.score,
    win: Number(row.WIN ?? 0)
  }))

  const probabilityBars = Object.entries(probabilityTable).map(([score, v]) => ({
    score: Number(score),
    prob: v.p,
    n: v.n
  }))

  const strength = latest ? [
    { name: 'DOL', value: -sign(Number(latest.DOL ?? 0)) },
    { name: 'EWZ', value: sign(Number(latest.EWZ ?? 0)) },
    { name: 'ITUB4', value: sign(Number(latest.ITUB4 ?? latest.ITAU_B3 ?? 0)) },
    { name: 'VALE3', value: sign(Number(latest.VALE3 ?? latest.VALE_B3 ?? 0)) },
    { name: 'ITUB_US', value: sign(Number(latest.ITUB_US ?? 0)) },
    { name: 'VALE_US', value: sign(Number(latest.VALE_US ?? 0)) },
    { name: 'PBR_A', value: sign(Number(latest.PBR_A ?? 0)) }
  ] : []

  const handleUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target.result
      let json = []
      if (file.name.toLowerCase().endsWith('.csv')) {
        json = readCsv(result)
      } else {
        const wb = XLSX.read(new Uint8Array(result), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        json = XLSX.utils.sheet_to_json(ws, { defval: 0 })
      }
      setRows(normalizeRows(json))
    }

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file, 'utf-8')
    } else {
      reader.readAsArrayBuffer(file)
    }
  }

  const signalClass =
    latest?.signal?.includes('COMPRA')
      ? 'signal buy'
      : latest?.signal?.includes('VENDA')
        ? 'signal sell'
        : 'signal neutral'

  return (
    <div className="page">
      <div className="container">
        <header className="hero">
          <div>
            <div className="eyebrow">Silva Trading</div>
            <h1>Dashboard Online</h1>
            <p>Painel com score, sinal e probabilidade histórica real dos seus dados.</p>
          </div>
          <label className="upload">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} />
            <span>Enviar XLSX/CSV</span>
          </label>
        </header>

        <div className="file-pill">Arquivo atual: {fileName}</div>

        <section className="grid cards">
          <article className="card">
            <div className="card-label">Score Atual</div>
            <div className="big-number">{latest?.score ?? 0}</div>
            <div className="muted">Escala de -7 a +7</div>
          </article>

          <article className="card">
            <div className="card-label">Sinal Atual</div>
            <div className={signalClass}>{latest?.signal ?? 'NEUTRO'}</div>
            <div className="muted">Melhor operar nos extremos</div>
          </article>

          <article className="card">
            <div className="card-label">Probabilidade Histórica</div>
            <div className="big-number small">{latest?.probability != null ? pct(latest.probability) : '--'}</div>
            <div className="muted">Ocorrências: {latest?.occurrences ?? '--'}</div>
          </article>

          <article className="card">
            <div className="card-label">Diagnóstico</div>
            <div className="diagnostic">
              {latest?.score >= 4 ? 'Edge positivo' : latest?.score <= -4 ? 'Pressão vendedora' : 'Zona neutra'}
            </div>
            <div className="muted">
              {latest?.score >= 4 ? 'Fluxo forte de compra' : latest?.score <= -4 ? 'Fluxo forte de venda' : 'Mercado sem consenso'}
            </div>
          </article>
        </section>

        <section className="grid charts">
          <article className="card span-2">
            <div className="card-title">Score ao longo do tempo</div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[-7, 7]} stroke="#9fb0c3" />
                  <Tooltip />
                  <ReferenceLine y={4} stroke="#10b981" strokeDasharray="4 4" />
                  <ReferenceLine y={-4} stroke="#ef4444" strokeDasharray="4 4" />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card">
            <div className="card-title">Força dos ativos</div>
            <div className="strength-list">
              {strength.map((item) => {
                const width = item.value === 1 ? '100%' : item.value === -1 ? '0%' : '50%'
                return (
                  <div key={item.name} className="strength-item">
                    <div className="strength-head">
                      <span>{item.name}</span>
                      <span className={item.value === 1 ? 'up' : item.value === -1 ? 'down' : 'flat'}>
                        {item.value === 1 ? 'Alta' : item.value === -1 ? 'Baixa' : 'Neutro'}
                      </span>
                    </div>
                    <div className="bar">
                      <div className={`fill ${item.value === 1 ? 'fill-up' : item.value === -1 ? 'fill-down' : 'fill-flat'}`} style={{ width }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
        </section>

        <section className="grid charts">
          <article className="card">
            <div className="card-title">Probabilidade por score</div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={probabilityBars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243041" />
                  <XAxis dataKey="score" stroke="#9fb0c3" />
                  <YAxis stroke="#9fb0c3" />
                  <Tooltip />
                  <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 4" />
                  <Bar dataKey="prob" fill="#38bdf8" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card">
            <div className="card-title">Leitura profissional</div>
            <div className="insights">
              <div className="insight insight-good">
                <strong>Melhores zonas</strong>
                <p>Scores +4, +5 e -5 foram os pontos mais consistentes na base histórica.</p>
              </div>
              <div className="insight insight-warn">
                <strong>Evitar</strong>
                <p>Scores +3 e -3 ficaram fracos na sua amostra. Melhor aguardar extremos.</p>
              </div>
              <div className="insight insight-info">
                <strong>Formato do arquivo</strong>
                <p>Use colunas Datetime, WIN, DOL, EWZ, ITUB4, VALE3, ITUB_US, VALE_US e PBR_A.</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}