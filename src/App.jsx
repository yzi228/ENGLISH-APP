import { useState, useEffect } from 'react';

// 預設推薦單字（一打開就能直接點選練習）
const SAMPLE_WORDS = ['resilient', 'serendipity', 'eloquent', 'ephemeral', 'ubiquitous'];

export default function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'vocab' | 'quiz'
  const [query, setQuery] = useState('');
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 生字本狀態（自動儲存在瀏覽器 localStorage）
  const [savedWords, setSavedWords] = useState(() => {
    try {
      const saved = localStorage.getItem('my_english_vocab');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 測驗模式狀態
  const [quizIndex, setQuizIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    localStorage.setItem('my_english_vocab', JSON.stringify(savedWords));
  }, [savedWords]);

  // 語音朗讀功能 (使用瀏覽器內建 TTS)
  const speakText = (text, rate = 1.0) => {
    if (!('speechSynthesis' in window)) {
      alert('你的瀏覽器不支援語音朗讀功能');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  // 查詢單字 (串接免費 Dictionary API)
  const handleSearch = async (targetWord) => {
    const searchWord = (typeof targetWord === 'string' ? targetWord : query).trim().toLowerCase();
    if (!searchWord) return;

    setQuery(searchWord);
    setLoading(true);
    setError('');
    setWordData(null);

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchWord)}`);
      if (!res.ok) {
        throw new Error('找不到這個單字，請檢查拼字是否正確！');
      }
      const data = await res.json();
      setWordData(data[0]);
    } catch (err) {
      setError(err.message || '查詢發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 加入或移除生字本
  const toggleSaveWord = (entry) => {
    const exists = savedWords.some((item) => item.word === entry.word);
    if (exists) {
      setSavedWords(savedWords.filter((item) => item.word !== entry.word));
    } else {
      const firstMeaning = entry.meanings?.[0];
      const firstDef = firstMeaning?.definitions?.[0]?.definition || 'No definition';
      const firstEx = firstMeaning?.definitions?.[0]?.example || '';
      setSavedWords([
        {
          word: entry.word,
          phonetic: entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || '',
          partOfSpeech: firstMeaning?.partOfSpeech || '',
          definition: firstDef,
          example: firstEx,
        },
        ...savedWords,
      ]);
    }
  };

  const isSaved = wordData && savedWords.some((item) => item.word === wordData.word);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* 頂部標題與導覽列 */}
        <header style={styles.header}>
          <div style={styles.titleRow}>
            <span style={{ fontSize: '36px' }}>📚</span>
            <h1 style={styles.title}>我的英文單字學習網</h1>
          </div>
          <p style={styles.subtitle}>支援即時字典查詢、真人美式發音、個人生字本與字卡複習</p>

          <nav style={styles.nav}>
            <button
              style={activeTab === 'search' ? styles.navBtnActive : styles.navBtn}
              onClick={() => setActiveTab('search')}
            >
              🔍 單字查詢
            </button>
            <button
              style={activeTab === 'vocab' ? styles.navBtnActive : styles.navBtn}
              onClick={() => setActiveTab('vocab')}
            >
              ⭐ 我的生字本 ({savedWords.length})
            </button>
            <button
              style={activeTab === 'quiz' ? styles.navBtnActive : styles.navBtn}
              onClick={() => {
                setActiveTab('quiz');
                setQuizIndex(0);
                setShowAnswer(false);
              }}
            >
              🧠 字卡複習測驗
            </button>
          </nav>
        </header>

        {/* 分頁一：單字查詢 */}
        {activeTab === 'search' && (
          <main>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              style={styles.searchBox}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="輸入英文單字 (例如: resilient, apple)..."
                style={styles.input}
              />
              <button type="submit" style={styles.searchBtn} disabled={loading}>
                {loading ? '查詢中...' : '搜尋'}
              </button>
            </form>

            {/* 熱門推薦單字標籤 */}
            <div style={styles.sampleRow}>
              <span style={{ color: '#64748b', fontSize: '14px' }}>試試看查詢：</span>
              {SAMPLE_WORDS.map((w) => (
                <button key={w} onClick={() => handleSearch(w)} style={styles.sampleChip}>
                  {w}
                </button>
              ))}
            </div>

            {error && <div style={styles.errorBox}>⚠️ {error}</div>}

            {/* 查詢結果卡片 */}
            {wordData && (
              <div style={styles.card}>
                <div style={styles.wordHeader}>
                  <div>
                    <h2 style={styles.wordTitle}>{wordData.word}</h2>
                    <span style={styles.phonetic}>
                      {wordData.phonetic || wordData.phonetics?.find((p) => p.text)?.text || ''}
                    </span>
                  </div>
                  <div style={styles.actionGroup}>
                    <button onClick={() => speakText(wordData.word, 1.0)} style={styles.audioBtn}>
                      🔊 標準發音
                    </button>
                    <button onClick={() => speakText(wordData.word, 0.65)} style={styles.audioBtnSlow}>
                      🐢 慢速
                    </button>
                    <button
                      onClick={() => toggleSaveWord(wordData)}
                      style={isSaved ? styles.savedBtn : styles.saveBtn}
                    >
                      {isSaved ? '★ 已收藏' : '☆ 加入生字本'}
                    </button>
                  </div>
                </div>

                {wordData.meanings?.map((meaning, idx) => (
                  <div key={idx} style={styles.meaningBlock}>
                    <span style={styles.posBadge}>{meaning.partOfSpeech}</span>
                    <ul style={styles.defList}>
                      {meaning.definitions.slice(0, 3).map((def, dIdx) => (
                        <li key={dIdx} style={styles.defItem}>
                          <div style={styles.defText}>{def.definition}</div>
                          {def.example && (
                            <div style={styles.exampleBox}>
                              <span>例句："{def.example}"</span>
                              <button
                                onClick={() => speakText(def.example, 0.95)}
                                style={styles.miniAudioBtn}
                                title="朗讀例句"
                              >
                                🔊
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* 分頁二：我的生字本 */}
        {activeTab === 'vocab' && (
          <main>
            {savedWords.length === 0 ? (
              <div style={styles.emptyBox}>
                目前生字本還是空的喔！先去「單字查詢」搜尋單字並按下「☆ 加入生字本」吧。
              </div>
            ) : (
              <div style={styles.grid}>
                {savedWords.map((item) => (
                  <div key={item.word} style={styles.vocabCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '20px', color: '#1e293b' }}>{item.word}</strong>
                        <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '14px' }}>{item.phonetic}</span>
                      </div>
                      <div>
                        <button onClick={() => speakText(item.word)} style={styles.miniAudioBtn}>🔊</button>
                        <button
                          onClick={() => setSavedWords(savedWords.filter((w) => w.word !== item.word))}
                          style={styles.deleteBtn}
                        >
                          移除
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <span style={styles.posBadge}>{item.partOfSpeech}</span>
                    </div>
                    <p style={{ margin: '10px 0 0', color: '#334155', fontSize: '15px', lineHeight: '1.5' }}>
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* 分頁三：字卡複習測驗 */}
        {activeTab === 'quiz' && (
          <main>
            {savedWords.length === 0 ? (
              <div style={styles.emptyBox}>
                生字本裡至少要有 1 個單字才能開始複習喔！請先收藏幾個單字。
              </div>
            ) : (
              <div style={styles.quizCard}>
                <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '12px' }}>
                  複習進度：{quizIndex + 1} / {savedWords.length}
                </div>
                <h2 style={{ fontSize: '36px', margin: '10px 0', color: '#0f172a' }}>
                  {savedWords[quizIndex].word}
                </h2>
                <button
                  onClick={() => speakText(savedWords[quizIndex].word)}
                  style={{ ...styles.audioBtn, marginBottom: '20px' }}
                >
                  🔊 聽發音提示
                </button>

                {showAnswer ? (
                  <div style={styles.answerBox}>
                    <span style={styles.posBadge}>{savedWords[quizIndex].partOfSpeech}</span>
                    <p style={{ fontSize: '18px', color: '#1e293b', marginTop: '10px' }}>
                      {savedWords[quizIndex].definition}
                    </p>
                    {savedWords[quizIndex].example && (
                      <p style={{ fontSize: '14px', color: '#475569', fontStyle: 'italic' }}>
                        "{savedWords[quizIndex].example}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <button onClick={() => setShowAnswer(true)} style={styles.revealBtn}>
                      👀 顯示字義與例句
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setShowAnswer(false);
                      setQuizIndex((prev) => (prev + 1) % savedWords.length);
                    }}
                    style={styles.nextBtn}
                  >
                    下一個單字 ➔
                  </button>
                </div>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    padding: '32px 16px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    color: '#64748b',
    marginTop: '8px',
    fontSize: '15px',
  },
  nav: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  navBtn: {
    padding: '10px 18px',
    borderRadius: '999px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  navBtnActive: {
    padding: '10px 18px',
    borderRadius: '999px',
    border: '1px solid #2563eb',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
  },
  searchBox: {
    display: 'flex',
    gap: '10px',
    backgroundColor: '#ffffff',
    padding: '8px',
    borderRadius: '14px',
    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '17px',
    padding: '10px 14px',
    color: '#0f172a',
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  sampleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '14px',
    flexWrap: 'wrap',
  },
  sampleChip: {
    backgroundColor: '#e2e8f0',
    border: 'none',
    borderRadius: '999px',
    padding: '4px 12px',
    fontSize: '13px',
    color: '#334155',
    cursor: 'pointer',
  },
  errorBox: {
    marginTop: '20px',
    padding: '14px 18px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    color: '#b91c1c',
  },
  card: {
    marginTop: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)',
  },
  wordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '18px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  wordTitle: {
    fontSize: '34px',
    margin: 0,
    color: '#0f172a',
  },
  phonetic: {
    color: '#2563eb',
    fontSize: '16px',
    fontWeight: '500',
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  audioBtn: {
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  audioBtnSlow: {
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveBtn: {
    backgroundColor: '#fefce8',
    color: '#a16207',
    border: '1px solid #fde047',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  savedBtn: {
    backgroundColor: '#eab308',
    color: '#ffffff',
    border: '1px solid #ca8a04',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  meaningBlock: {
    marginTop: '20px',
  },
  posBadge: {
    display: 'inline-block',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
  },
  defList: {
    marginTop: '10px',
    paddingLeft: '20px',
  },
  defItem: {
    marginBottom: '12px',
    color: '#1e293b',
    lineHeight: '1.6',
  },
  defText: {
    fontSize: '16px',
  },
  exampleBox: {
    marginTop: '4px',
    color: '#64748b',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  miniAudioBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    padding: '40px 20px',
    borderRadius: '16px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  vocabCard: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
  },
  deleteBtn: {
    marginLeft: '8px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  quizCard: {
    backgroundColor: '#ffffff',
    padding: '36px 24px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)',
  },
  answerBox: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    maxWidth: '500px',
    margin: '0 auto',
  },
  revealBtn: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  nextBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
