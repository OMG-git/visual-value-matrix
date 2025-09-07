// ReactとNext.jsで必要な基本部品をインポート
import { useState, useEffect } from 'react';
import axios from 'axios';
// rechartsライブラリから、チャート作成に必要な部品をインポート
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ★★★ データ取得先 ★★★
// AWSのURLではなく、Step 2-3で作成した「中継役」のURLを指定します。
// これにより、ブラウザはAWSの存在を一切知りません。
const API_ENDPOINT = '/api/stocks';

// ... (ファイルの上部)

// チャートのバブルにマウスを乗せた時に表示される情報ボックスの見た目を定義
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      // ↓↓↓ このdivのstyleを修正しました ↓↓↓
      <div style={{
        backgroundColor: '#E0F7FA', // 明るい水色の背景
        border: '1px solid #B2EBF2',  // 背景より少しだけ濃い水色の境界線
        borderRadius: '8px',          // 角を丸くする
        padding: '12px',              // 内側の余白
        color: '#000000',             // ★★★ 文字色を黒に指定 ★★★
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)' // わずかな影
      }}>
        {/* pタグのstyleはシンプルに戻し、親divから文字色を継承させます */}
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{data.name} ({data.ticker})</p>
        <p style={{ margin: 0 }}>PBR (割安性): {data.pbr.toFixed(2)}</p>
        <p style={{ margin: 0 }}>ROE (収益性): {(data.roe * 100).toFixed(2)}%</p>
        <p style={{ margin: 0 }}>時価総額: {(data.marketCap / 1e9).toFixed(2)}B (十億ドル)</p>
      </div>
    );
  }
  return null;
};
// ... (以下略)

// このページの本体部分
export default function Home() {
  // 状態(state)を管理するための変数を定義
  // data: APIから取得した株価データ。最初は空っぽの配列[]。
  // loading: データを読み込み中かどうかを示すフラグ。最初はtrue(読み込み中)。
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // useEffect: このページが最初に表示された時に、一度だけ実行される処理
  useEffect(() => {
    // データを取得する非同期関数を定義
    const fetchData = async () => {
      try {
        // axiosを使って、定義したAPI_ENDPOINTにGETリクエストを送る
        const response = await axios.get(API_ENDPOINT);
        // 取得したデータで state を更新する
        setData(response.data);
      } catch (error) {
        console.error("データの取得に失敗しました:", error);
      } finally {
        // 成功しても失敗しても、最後にローディング状態をfalse(完了)にする
        setLoading(false);
      }
    };
    // 上で定義した関数を実行
    fetchData();
  }, []); // 第2引数の[]は「最初の一度だけ実行」を意味するおまじない

  // もしローディング中(loadingがtrue)なら、このメッセージを表示
  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>データをAWSから読み込み中...</div>;
  }

  // ローディングが終わったら、以下のHTMLとチャートを表示
  return (
    <div style={{ width: '95vw', height: '95vh', margin: 'auto' }}>
      <h1 style={{ textAlign: 'center' }}>Visual Value Matrix (PBR vs ROE)</h1>
      <ResponsiveContainer width="100%" height="90%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey="pbr" name="PBR" domain={['dataMin', 'dataMax']} label={{ value: "PBR (低いほど割安 →)", position: "insideBottom", offset: -25 }} />
          <YAxis type="number" dataKey="roe" name="ROE" unit="%" tickFormatter={(tick) => (tick * 100).toFixed(0)} label={{ value: "ROE (高いほど高収益 ↑)", angle: -90, position: 'insideLeft' }} />
          <ZAxis type="number" dataKey="marketCap" range={[100, 1000]} name="時価総額" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />
          <Scatter name="銘柄" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}