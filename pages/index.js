import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label } from 'recharts';

const API_ENDPOINT = '/api/stocks';

// --- ツールチップコンポーネント (変更なし) ---
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #dee2e6',
        borderRadius: '8px', padding: '1rem', color: '#343a40',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(5px)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '1.1em' }}>{data.name} ({data.ticker})</p>
        <p style={{ margin: '4px 0', color: '#7f8c8d' }}>{data.sector}</p>
        <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '8px 0' }}/>
        <p style={{ margin: 0 }}>PBR: <strong>{data.pbr.toFixed(2)}</strong></p>
        <p style={{ margin: 0 }}>ROE: <strong>{(data.roe * 100).toFixed(2)}%</strong></p>
        <p style={{ margin: 0 }}>時価総額: <strong>{(data.marketCap / 1e9).toFixed(1)}B</strong></p>
      </div>
    );
  }
  return null;
};

// --- メインページコンポーネント ---
export default function Home() {
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuadrant, setActiveQuadrant] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');

  // --- ★★★ データ処理 (外れ値の分離機能を追加) ★★★ ---
  const { processedData, outliers, sectorList, avgPbr, avgRoe } = useMemo(() => {
    if (!allData.length) return { processedData: [], outliers: [], sectorList: [], avgPbr: 1, avgRoe: 0.15 };
    
    const dataWithSector = allData.filter(d => d.sector); // セクター情報がない銘柄を除外
    
    const chartData = [];
    const outlierData = [];
    const pbrThreshold = 25;
    const roeUpperThreshold = 1.0; // 100%
    const roeLowerThreshold = -0.5; // -50%

    dataWithSector.forEach(d => {
      let outlierReason = '';
      if (d.pbr <= 0) outlierReason = 'PBRが0以下';
      else if (d.pbr >= pbrThreshold) outlierReason = `PBRが高すぎ (${d.pbr.toFixed(1)})`;
      else if (d.roe >= roeUpperThreshold) outlierReason = `ROEが高すぎ (${(d.roe*100).toFixed(0)}%)`;
      else if (d.roe <= roeLowerThreshold) outlierReason = `ROEが低すぎ (${(d.roe*100).toFixed(0)}%)`;

      if (outlierReason) {
        outlierData.push({ ...d, reason: outlierReason });
      } else {
        chartData.push(d);
      }
    });

    const sectors = ['ALL', ...new Set(chartData.map(item => item.sector).sort())];
    
    const sortedPbr = [...chartData].sort((a, b) => a.pbr - b.pbr);
    const sortedRoe = [...chartData].sort((a, b) => a.roe - b.roe);
    const mid = Math.floor(sortedPbr.length / 2);
    const medianPbr = sortedPbr.length > 0 ? (sortedPbr.length % 2 === 0 ? (sortedPbr[mid - 1].pbr + sortedPbr[mid].pbr) / 2 : sortedPbr[mid].pbr) : 1;
    const medianRoe = sortedRoe.length > 0 ? (sortedRoe.length % 2 === 0 ? (sortedRoe[mid - 1].roe + sortedRoe[mid].roe) / 2 : sortedRoe[mid].roe) : 0.15;

    return { processedData: chartData, outliers: outlierData, sectorList: sectors, avgPbr: medianPbr, avgRoe: medianRoe };
  }, [allData]);

  // --- 表示用データのフィルタリング (変更なし) ---
  const filteredForDisplay = useMemo(() => {
    // ... (この部分は前回のコードと全く同じなので省略) ...
    const checkQuadrant = (item) => {
      if (activeQuadrant === 'ALL') return true;
      if (activeQuadrant === 'TOP_RIGHT') return item.pbr >= avgPbr && item.roe >= avgRoe;
      if (activeQuadrant === 'TOP_LEFT') return item.pbr < avgPbr && item.roe >= avgRoe;
      if (activeQuadrant === 'BOTTOM_LEFT') return item.pbr < avgPbr && item.roe < avgRoe;
      if (activeQuadrant === 'BOTTOM_RIGHT') return item.pbr >= avgPbr && item.roe < avgRoe;
      return true;
    };
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const hasSearchTerm = searchTerm !== '';
    return processedData.map(item => {
      const isInSearch = hasSearchTerm ? (item.ticker.toLowerCase().includes(lowerCaseSearchTerm) || item.name.toLowerCase().includes(lowerCaseSearchTerm)) : true;
      const isInQuadrant = checkQuadrant(item);
      const isInSector = selectedSector === 'ALL' || item.sector === selectedSector;
      let opacity = 0.7;
      if (!isInQuadrant || !isInSector) opacity = 0.05;
      if (hasSearchTerm && !isInSearch) opacity = 0.05;
      if (hasSearchTerm && isInSearch) opacity = 1.0;
      return { ...item, fillOpacity: opacity };
    });
  }, [processedData, searchTerm, activeQuadrant, selectedSector, avgPbr, avgRoe]);


  // --- データ取得 (初回実行) (変更なし) ---
  useEffect(() => {
    // ... (この部分は前回のコードと全く同じなので省略) ...
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINT);
        setAllData(response.data);
      } catch (error) { console.error("データの取得に失敗:", error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);
  
  // --- UIコンポーネント定義 (変更なし) ---
  const QuadrantButton = ({ quadrant, label }) => (
    // ... (この部分は前回のコードと全く同じなので省略) ...
    <button onClick={() => setActiveQuadrant(quadrant)}
      style={{
        padding: '8px 12px', fontSize: '0.85em', border: '1px solid #ced4da',
        borderRadius: '20px', margin: '2px', cursor: 'pointer',
        backgroundColor: activeQuadrant === quadrant ? '#3f51b5' : '#fff',
        color: activeQuadrant === quadrant ? '#fff' : '#495057',
        transition: 'all 0.2s', flexShrink: 0
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '1rem' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '2rem', padding: '0 1rem' }}>
          <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '2.5rem', fontWeight: 700 }}>Visual Value Matrix</h1>
          <p style={{ margin: '0.5rem 0', fontSize: '1.2rem', color: '#7f8c8d' }}>S&P 100銘柄 PBR-ROE 分布マップ</p>
        </header>

        {/* --- コントロールパネル (変更なし) --- */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: '1rem', 
          padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '2rem', margin: '0 1rem 2rem 1rem'
        }}>
          {/* ... (この部分は前回のコードと全く同じなので省略) ... */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <input type="text" placeholder="銘柄名・ティッカーで検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: '300px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ced4da' }} />
            <div>
              <label htmlFor="sector-select" style={{ marginRight: '10px', color: '#495057', fontSize: '0.9em' }}>セクターで絞り込み:</label>
              <select id="sector-select" value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}
                style={{ padding: '12px 16px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #ced4da', minWidth: '250px' }}>
                {sectorList.map(sector => (
                  <option key={sector} value={sector}>{sector === 'ALL' ? '全セクター' : sector}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', borderTop: '1px solid #e9ecef', paddingTop: '1rem' }}>
            <QuadrantButton quadrant="ALL" label="全表示" />
            <QuadrantButton quadrant="TOP_LEFT" label="お宝株 (高ROE/低PBR)" />
            <QuadrantButton quadrant="TOP_RIGHT" label="優良株 (高ROE/高PBR)" />
            <QuadrantButton quadrant="BOTTOM_LEFT" label="バリュー株 (低ROE/低PBR)" />
            <QuadrantButton quadrant="BOTTOM_RIGHT" label="割高注意 (低ROE/高PBR)" />
          </div>
        </div>

        {/* --- ★★★ チャートと外れ値ボックスのコンテナ ★★★ --- */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          
          {/* --- チャート本体 --- */}
          <main style={{ flexGrow: 1, backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.5rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            {loading ? ( <div style={{ textAlign: 'center', height: '650px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>データを読み込み中...</div> ) : (
              <ResponsiveContainer width="100%" height={650}>
                {/* ... (ScatterChart部分は前回のコードと全く同じなので省略) ... */}
                <ScatterChart margin={{ top: 20, right: 40, bottom: 50, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis type="number" dataKey="pbr" name="PBR" domain={[0, 'dataMax']} label={{ value: "PBR (割安性 →)", position: "insideBottom", offset: -35 }} />
                  <YAxis type="number" dataKey="roe" name="ROE" tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} domain={['dataMin - 0.05', 'dataMax + 0.05']} label={{ value: "ROE (収益性 ↑)", angle: -90, position: 'insideLeft' }} />
                  <ZAxis type="number" dataKey="marketCap" range={[60, 1000]} name="時価総額" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine y={avgRoe} stroke="#e91e63" strokeDasharray="3 3">
                    <Label value={`ROE中央値: ${(avgRoe * 100).toFixed(1)}%`} position="top" fill="#e91e63" style={{ fontSize: '0.8em' }} />
                  </ReferenceLine>
                  <ReferenceLine x={avgPbr} stroke="#2196f3" strokeDasharray="3 3">
                    <Label value={`PBR中央値: ${avgPbr.toFixed(1)}`} position="right" fill="#2196f3" style={{ fontSize: '0.8em' }} />
                  </ReferenceLine>
                  <Scatter name="S&P 100" data={filteredForDisplay} fill="#3f51b5" fillOpacity={item => item.fillOpacity} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </main>

          {/* --- ★★★ 外れ値ボックス ★★★ --- */}
          {!loading && outliers.length > 0 && (
            <aside style={{
              width: '300px', flexShrink: 0, backgroundColor: '#ffffff',
              borderRadius: '12px', padding: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ marginTop: 0, borderBottom: '2px solid #3f51b5', paddingBottom: '0.5rem' }}>外れ値銘柄</h3>
              <p style={{ fontSize: '0.8em', color: '#7f8c8d' }}>チャートの可視性を高めるため、以下の極端な値を持つ銘柄は除外されています。</p>
              <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                {outliers.map(item => (
                  <div key={item.ticker} style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{item.name} ({item.ticker})</p>
                    <p style={{ margin: '4px 0', fontSize: '0.9em', color: '#c0392b' }}>理由: {item.reason}</p>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>

        {/* --- ★★★ 注意書きフッター ★★★ --- */}
        <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85em', color: '#7f8c8d', padding: '0 1rem' }}>
          <p><strong>【ご利用上の注意】</strong>データは週に一度更新されます。表示されているPBR/ROEは中央値であり、平均値とは異なります。本アプリケーションは投資判断を補助する目的で作成されており、特定の銘柄の購入を推奨するものではありません。投資の最終決定はご自身の判断でお願いします。</p>
        </footer>

      </div>
    </div>
  );
}