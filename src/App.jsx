import { useState } from 'react';

export default function App() {
  const [word, setWord] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 查詢單字 API
  const searchWord = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!response.ok) throw new Error('找不到這個單字！');
      const data = await response.json();
      setResult(data[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 播放語音
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>📚 我的英文單字學習網</h1>
      
      {/* 搜尋列 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="輸入英文單字 (例如: hello)"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchWord()}
          style={{ flex: 1, padding: '10px', fontSize: '16px' }}
        />
        <button onClick={searchWord} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          搜尋
        </button>
      </div>

      {/* 狀態提示 */}
      {loading && <p>查詢中...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* 查詢結果 */}
      {result && (
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ margin: 0 }}>{result.word}</h2>
            <button onClick={() => speak(result.word)} style={{ padding: '6px 12px', cursor: 'pointer' }}>
              🔊 播放發音
            </button>
          </div>

          <p style={{ color: '#666' }}>{result.phonetic}</p>

          <h3>詞性與釋義：</h3>
          {result.meanings.map((meaning, idx) => (
            <div key={idx} style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#2b6cb0' }}>[{meaning.partOfSpeech}]</strong>
              <ul>
                {meaning.definitions.slice(0, 3).map((def, dIdx) => (
                  <li key={dIdx} style={{ marginBottom: '5px' }}>
                    {def.definition}
                    {def.example && <div style={{ color: '#555', fontStyle: 'italic' }}>例句: "{def.example}"</div>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}