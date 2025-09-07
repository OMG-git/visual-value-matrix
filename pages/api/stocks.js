// このファイルに書かれたコードは、ユーザーのブラウザではなく、
// Vercelのサーバー上でのみ実行されるため安全です。

// Next.jsのAPIルートの決まり文句
export default async function handler(req, res) {
  
    // Step 2-2で設定した「秘密の金庫」から情報を取り出す
    const API_GATEWAY_URL = process.env.API_GATEWAY_URL;
    const API_KEY = process.env.AWS_API_KEY;
  
    try {
      // fetch: JavaScriptでサーバーと通信するための命令
      // AWSのAPI Gatewayに対して、データをリクエストする
      const response = await fetch(API_GATEWAY_URL, {
        // headers: リクエストに含める追加情報
        headers: {
          // 'x-api-key': AWS API Gatewayが要求する「合言葉」のラベル
          // API_KEY: 秘密の金庫から取り出した実際の「合言葉」
          'x-api-key': API_KEY,
        },
      });
  
      // AWSからの応答がOKでなかった場合(エラーの場合)の処理
      if (!response.ok) {
        // エラーが発生したことを記録し、エラーを投げる
        console.error('Error from AWS:', response.status, response.statusText);
        throw new Error(`Error from AWS API: ${response.status}`);
      }
  
      // AWSからの応答(JSON形式)をJavaScriptのオブジェクトに変換
      const data = await response.json();
      
      // すべて成功したら、ブラウザに対してステータスコード200(成功)と
      // AWSから受け取ったデータをそのまま返す
      res.status(200).json(data);
  
    } catch (error) {
      // tryブロックのどこかでエラーが起きた場合の処理
      console.error('Proxy API Error:', error);
      // ブラウザに対してステータスコード500(サーバー内部エラー)と
      // エラーメッセージを返す
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }