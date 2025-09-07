import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label } from 'recharts';

const API_ENDPOINT = '/api/stocks';

// --- ツールチップコンポーネント ---
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#FFFFFF', border: '1px solid #DDDDDD', borderRadius: '8px',
        padding: '12px', color: '#333333', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '1.1em' }}>{data.name} ({data.ticker})</p>
        <p style={{ margin: 0 }}>PBR (割安性): {data.pbr.toFixed(2)}</p>
        <p style={{ margin: 0 }}>ROE (収益性): {(data.roe * 100).toFixed(2)}%</p>
        <p style={{ margin: 0 }}>時価総額: {(data.marketCap / 1e9).toFixed(2)}B</p>
      </div>
    );
  }
  return null;
};

// --- メインページコンポーネント ---
export default function Home() {
  const [allData, setAllData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeQuadrant, setActiveQuadrant] = useState('ALL'); // ALL, TOP_RIGHT, TOP_LEFT, BOTTOM_LEFT, BOTTOM_RIGHT

  // --- データ取得と平均値の計算 ---
  const { processedData, avgPbr, avgRoe } = useMemo(() => {
    if (!allData.length) return { processedData: [], avgPbr: 1, avgRoe: 0.15 };
    
    // 外れ値を除外
    const filtered = allData.filter(d => 
      d.pbr > 0 && d.roe > -0.5 && d.pbr < 25 && d.roe < 1 // PBR < 25x, -50% < ROE < 100%
    );

    // PBRとROEの中央値を計算（平均値より外れ値に強い）
    const sortedPbr = [...filtered].sort((a, b) => a.pbr - b.pbr);
    const sortedRoe = [...filtered].sort((a, b) => a.roe - b.roe);
    const mid = Math.floor(sortedPbr.length / 2);
    const medianPbr = sortedPbr.length % 2 === 0 ? (sortedPbr[mid - 1].pbr + sortedPbr[mid].pbr) / 2 : sortedPbr[mid].pbr;
    const medianRoe = sortedRoe.length % 2 === 0 ? (sortedRoe[mid - 1].roe + sortedRoe[mid].roe) / 2 : sortedRoe[mid].roe;

    return { processedData: filtered, avgPbr: medianPbr, avgRoe: medianRoe };
  }, [allData]);

  // --- 表示用データのフィルタリング ---
  const filteredForDisplay = useMemo(() => {
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
      
      let opacity = 0.7;
      if (!isInQuadrant) opacity = 0.05;
      if (hasSearchTerm && !isInSearch) opacity = 0.05;
      if (hasSearchTerm && isInSearch) opacity = 1.0;

      return { ...item, fillOpacity: opacity };
    });
  }, [processedData, searchTerm, activeQuadrant, avgPbr, avgRoe]);


  // --- データ取得ロジック ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINT);
        setAllData(response.data);
      } catch (error) {
        console.error("データの取得に失敗しました:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const QuadrantButton = ({ quadrant, label }) => (
    <button onClick={() => setActiveQuadrant(quadrant)}
      style={{
        padding: '8px 16px', fontSize: '0.9em', border: '1px solid #ccc',
        borderRadius: '20px', margin: '0 5px', cursor: 'pointer',
        backgroundColor: activeQuadrant === quadrant ? '#3f51b5' : '#fff',
        color: activeQuadrant === quadrant ? '#fff' : '#333',
        transition: 'all 0.2s'
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, color: '#1a237e' }}>Visual Value Matrix</h1>
          <p style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>S&P 100銘柄 PBR-ROE 分布マップ</p>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <input type="text" placeholder="銘柄名・ティッカーで検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '40%', padding: '10px 15px', borderRadius: '20px', border: '1px solid #ccc' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <QuadrantButton quadrant="ALL" label="全表示" />
          <QuadrantButton quadrant="TOP_LEFT" label="お宝株 (高ROE/低PBR)" />
          <QuadrantButton quadrant="TOP_RIGHT" label="優良株 (高ROE/高PBR)" />
          <QuadrantButton quadrant="BOTTOM_LEFT" label="バリュー株 (低ROE/低PBR)" />
          <QuadrantButton quadrant="BOTTOM_RIGHT" label="割高注意 (低ROE/高PBR)" />
        </div>

        <main style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem' }}>データを読み込み中...</div>
          ) : (
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart margin={{ top: 20, right: 40, bottom: 50, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="pbr" name="PBR" domain={[0, 'dataMax']} label={{ value: "PBR (割安性 →)", position: "insideBottom", offset: -35 }} />
                <YAxis type="number" dataKey="roe" name="ROE" tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} domain={['auto', 'auto']} label={{ value: "ROE (収益性 ↑)", angle: -90, position: 'insideLeft' }} />
                <ZAxis type="number" dataKey="marketCap" range={[60, 1000]} name="時価総額" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                
                {/* 中央値を基準線として描画 */}
                <ReferenceLine y={avgRoe} stroke="#e91e63" strokeDasharray="3 3">
                  <Label value={`ROE中央値: ${(avgRoe * 100).toFixed(1)}%`} position="insideTopRight" fill="#e91e63" />
                </ReferenceLine>
                <ReferenceLine x={avgPbr} stroke="#2196f3" strokeDasharray="3 3">
                  <Label value={`PBR中央値: ${avgPbr.toFixed(1)}`} position="insideTopRight" fill="#2196f3" />
                </ReferenceLine>
                
                <Scatter name="S&P 100" data={filteredForDisplay} fill="#3f51b5" fillOpacity={item => item.fillOpacity} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </main>
      </div>
    </div>
  );
}