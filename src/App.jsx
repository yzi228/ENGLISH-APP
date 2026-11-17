import { useState, useEffect } from 'react';

const SAMPLE_WORDS = ['resilient', 'serendipity', 'eloquent', 'ephemeral', 'ubiquitous'];

// 內建必考精選單字庫（方便一鍵匯入或當作測驗干擾選項）
const STARTER_DECK = [
  { word: 'resilient', phonetic: '/rɪˈzɪljənt/', partOfSpeech: 'adjective', zh: '有韌性的；能迅速恢復的', definition: 'Able to withstand or recover quickly from difficult conditions.', example: 'She is a resilient girl who never gives up.' },
  { word: 'serendipity', phonetic: '/ˌsɛrənˈdɪpɪti/', partOfSpeech: 'noun', zh: '意外發現珍奇事物的運氣；機緣巧合', definition: 'The occurrence of events by chance in a happy or beneficial way.', example: 'Finding that rare book was pure serendipity.' },
  { word: 'eloquent', phonetic: '/ˈɛləkwənt/', partOfSpeech: 'adjective', zh: '雄辯的；有口才的', definition: 'Fluent or persuasive in speaking or writing.', example: 'He gave an eloquent speech at the graduation ceremony.' },
  { word: 'ephemeral', phonetic: '/ɪˈfɛmərəl/', partOfSpeech: 'adjective', zh: '短暫的；朝生暮死的', definition: 'Lasting for a very short time.', example: 'Fame in the digital age can be ephemeral.' },
  { word: 'ubiquitous', phonetic: '/juːˈbɪkwɪtəs/', partOfSpeech: 'adjective', zh: '無所不在的；普遍存在的', definition: 'Present, appearing, or found everywhere.', example: 'Smartphones have become ubiquitous in daily life.' },
  { word: 'pragmatic', phonetic: '/præɡˈmætɪk/', partOfSpeech: 'adjective', zh: '務實的；實用主義的', definition: 'Dealing with things sensibly and realistically.', example: 'We need a pragmatic approach to solve this problem.' },
  { word: 'ambiguous', phonetic: '/æmˈbɪɡjuəs/', partOfSpeech: 'adjective', zh: '模稜兩可的；含糊不清的', definition: 'Open to more than one interpretation; not having one obvious meaning.', example: 'His reply was somewhat ambiguous.' },
  { word: 'meticulous', phonetic: '/məˈtɪkjʊləs/', partOfSpeech: 'adjective', zh: '一絲不苟的；極其細心的', definition: 'Showing great attention to detail; very careful and precise.', example: 'She is meticulous about keeping records.' },
  { word: 'catalyst', phonetic: '/ˈkætəlɪst/', partOfSpeech: 'noun', zh: '催化劑；促成因素', definition: 'A person or thing that precipitates an event.', example: 'The new policy acted as a catalyst for change.' },
  { word: 'inevitable', phonetic: '/ɪnˈɛvɪtəbl/', partOfSpeech: 'adjective', zh: '不可避免的；必然發生的', definition: 'Certain to happen; unavoidable.', example: 'Change is an inevitable part of life.' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'vocab' | 'quiz'
  const [query, setQuery] = useState('');
  const [wordData, setWordData] = useState(null);
  const [zhTranslation, setZhTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 生字本狀態
  const [savedWords, setSavedWords] = useState(() => {
    try {
      const saved = localStorage.getItem('my_english_vocab');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 測驗狀態
  const [quizMode, setQuizMode] = useState('choice'); // 'choice' | 'spelling'
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingResult, setSpellingResult] = useState(null); // 'correct' | 'wrong' | null
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    localStorage.setItem('my_english_vocab', JSON.stringify(savedWords));
  }, [savedWords]);

  // 語音朗讀
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

  // 查詢單字 + 自動抓取繁體中文翻譯
  const handleSearch = async (targetWord) => {
    const searchWord = (typeof targetWord === 'string' ? targetWord : query).trim().toLowerCase();
    if (!searchWord) return;

    setQuery(searchWord);
    setLoading(true);
    setError('');
    setWordData(null);
    setZhTranslation('');

    try {
      const [dictRes, transRes] = await Promise.all([
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchWord)}`),
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(searchWord)}&langpair=en|zh-TW`).catch(() => null),
      ]);

      if (!dictRes.ok) {
        throw new Error('找不到這個單字，請檢查拼字是否正確！');
      }

      const dictJson = await dictRes.json();
      setWordData(dictJson[0]);

      if (transRes && transRes.ok) {
        const transJson = await transRes.json();
        const translated = transJson?.responseData?.translatedText;
        if (translated && translated.toLowerCase() !== searchWord) {
          setZhTranslation(translated);
        }
      }
    } catch (err) {
      setError(err.message || '查詢發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 加入/移除生字本
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
          zh: zhTranslation || '（自訂收藏單字）',
          definition: firstDef,
          example: firstEx,
        },
        ...savedWords,
      ]);
    }
  };

  // 一鍵匯入內建精選單字
  const importStarterDeck = () => {
    const existingSet = new Set(savedWords.map((w) => w.word));
    const newItems = STARTER_DECK.filter((w) => !existingSet.has(w.word));
    if (newItems.length === 0) {
      alert('精選單字庫的 10 個單字都已經在你的生字本裡囉！');
      return;
    }
    setSavedWords([...newItems, ...savedWords]);
    alert(`成功匯入 ${newItems.length} 個必考精選單字！`);
  };

  // 匯出備份檔
  const exportVocab = () => {
    const blob = new Blob([JSON.stringify(savedWords, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `english-vocab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 匯入備份檔
  const importVocab = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          const existingSet = new Set(savedWords.map((w) => w.word));
          const merged = [...savedWords, ...parsed.filter((item) => item.word && !existingSet.has(item.word))];
          setSavedWords(merged);
          alert('生字本匯入成功！');
        }
      } catch {
        alert('檔案格式不正確，請選擇之前匯出的 .json 備份檔');
      }
    };
    reader.readAsText(file);
  };

  // 產生下一道測驗題
  const generateQuestion = (pool = savedWords) => {
    const activePool = pool.length > 0 ? pool : STARTER_DECK;
    const target = activePool[Math.floor(Math.random() * activePool.length)];

    // 組合所有可用單字作為干擾選項
    const allChoicesPool = [...savedWords, ...STARTER_DECK].filter(
      (item, index, self) => index === self.findIndex((t) => t.word === item.word)
    );

    const distractors = allChoicesPool
      .filter((item) => item.word !== target.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const mixedOptions = [target, ...distractors].sort(() => 0.5 - Math.random());

    setCurrentQuestion(target);
    setOptions(mixedOptions);
    setSelectedOption(null);
    setSpellingInput('');
    setSpellingResult(null);
  };

  const handleChoiceSelect = (option) => {
    if (selectedOption) return;
    setSelectedOption(option.word);
    if (option.word === currentQuestion.word) {
      setScore((s) => s + 10);
      setStreak((st) => st + 1);
      speakText(currentQuestion.word);
    } else {
      setStreak(0);
    }
  };

  const handleSpellingSubmit = (e) => {
    e.preventDefault();
    if (!spellingInput.trim() || spellingResult) return;
    const isCorrect = spellingInput.trim().toLowerCase() === currentQuestion.word.toLowerCase();
    setSpellingResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      setScore((s) => s + 15);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }
    speakText(currentQuestion.word);
  };

  const isSaved = wordData && savedWords.some((item) => item.word === wordData.word);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* 頂部標題與導覽 */}
        <header style={styles.header}>
          <div style={styles.titleRow}>
            <span style={{ fontSize: '36px' }}>📚</span>
            <h1 style={styles.title}>我的英文單字學習網</h1>
          </div>
          <p style={styles.subtitle}>英漢雙語字典 • 真人語音發音 • 雲端備份生字本 • 互動測驗挑戰</p>

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
                generateQuestion();
              }}
            >
              🏆 互動測驗挑戰
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

            <div style={styles.sampleRow}>
              <span style={{ color: '#64748b', fontSize: '14px' }}>試試看查詢：</span>
              {SAMPLE_WORDS.map((w) => (
                <button key={w} onClick={() => handleSearch(w)} style={styles.sampleChip}>
                  {w}
                </button>
              ))}
            </div>

            {error && <div style={styles.errorBox}>⚠️ {error}</div>}

            {wordData && (
              <div style={styles.card}>
                <div style={styles.wordHeader}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                      <h2 style={styles.wordTitle}>{wordData.word}</h2>
                      <span style={styles.phonetic}>
                        {wordData.phonetic || wordData.phonetics?.find((p) => p.text)?.text || ''}
                      </span>
                    </div>
                    {zhTranslation && (
                      <div style={styles.zhBadge}>中文意思：{zhTranslation}</div>
                    )}
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
            <div style={styles.toolbar}>
              <button onClick={importStarterDeck} style={styles.starterBtn}>
                ✨ 一鍵匯入 10 個必考單字
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {savedWords.length > 0 && (
                  <button onClick={exportVocab} style={styles.toolBtn}>
                    💾 下載備份
                  </button>
                )}
                <label style={styles.toolBtn}>
                  📂 還原備份
                  <input type="file" accept=".json" onChange={importVocab} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {savedWords.length === 0 ? (
              <div style={styles.emptyBox}>
                目前生字本還是空的喔！你可以按上方的「✨ 一鍵匯入 10 個必考單字」，或去「單字查詢」搜尋收藏。
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
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.posBadge}>{item.partOfSpeech}</span>
                      {item.zh && <span style={{ color: '#0369a1', fontWeight: '600', fontSize: '14px' }}>{item.zh}</span>}
                    </div>
                    <p style={{ margin: '10px 0 0', color: '#334155', fontSize: '14px', lineHeight: '1.5' }}>
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}

        {/* 分頁三：互動測驗挑戰 */}
        {activeTab === 'quiz' && currentQuestion && (
          <main>
            <div style={styles.quizTopBar}>
              <div style={styles.modeSwitch}>
                <button
                  onClick={() => {
                    setQuizMode('choice');
                    generateQuestion();
                  }}
                  style={quizMode === 'choice' ? styles.modeBtnActive : styles.modeBtn}
                >
                  📝 四選一選擇題
                </button>
                <button
                  onClick={() => {
                    setQuizMode('spelling');
                    generateQuestion();
                  }}
                  style={quizMode === 'spelling' ? styles.modeBtnActive : styles.modeBtn}
                >
                  ⌨️ 拼字挑戰
                </button>
              </div>
              <div style={styles.scoreBadge}>
                得分：<strong>{score}</strong> ｜ 🔥 連勝：<strong>{streak}</strong>
              </div>
            </div>

            <div style={styles.quizCard}>
              <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
                題庫來源：{savedWords.length > 0 ? `我的生字本 (${savedWords.length} 字)` : '內建精選題庫'}
              </div>

              {quizMode === 'choice' ? (
                <>
                  <h2 style={{ fontSize: '38px', margin: '10px 0', color: '#0f172a' }}>
                    {currentQuestion.word}
                  </h2>
                  <button
                    onClick={() => speakText(currentQuestion.word)}
                    style={{ ...styles.audioBtn, marginBottom: '24px' }}
                  >
                    🔊 聽發音
                  </button>

                  <div style={styles.optionsGrid}>
                    {options.map((opt) => {
                      let btnStyle = styles.optionBtn;
                      if (selectedOption) {
                        if (opt.word === currentQuestion.word) {
                          btnStyle = styles.optionCorrect;
                        } else if (opt.word === selectedOption) {
                          btnStyle = styles.optionWrong;
                        }
                      }
                      return (
                        <button
                          key={opt.word}
                          onClick={() => handleChoiceSelect(opt)}
                          style={btnStyle}
                        >
                          <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                            {opt.zh && opt.zh !== '（自訂收藏單字）' ? opt.zh : opt.definition}
                          </div>
                          {opt.zh && opt.zh !== '（自訂收藏單字）' && (
                            <div style={{ fontSize: '13px', opacity: 0.85 }}>{opt.definition}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ margin: '16px 0' }}>
                    <span style={styles.posBadge}>{currentQuestion.partOfSpeech}</span>
                    <h3 style={{ fontSize: '24px', color: '#0f172a', margin: '12px 0 6px' }}>
                      {currentQuestion.zh && currentQuestion.zh !== '（自訂收藏單字）'
                        ? currentQuestion.zh
                        : '請根據英文解釋拼出單字'}
                    </h3>
                    <p style={{ color: '#475569', fontSize: '16px', maxWidth: '520px', margin: '0 auto 16px' }}>
                      {currentQuestion.definition}
                    </p>
                    <button onClick={() => speakText(currentQuestion.word)} style={styles.audioBtn}>
                      🔊 聽發音提示
                    </button>
                  </div>

                  <form onSubmit={handleSpellingSubmit} style={{ maxWidth: '400px', margin: '20px auto' }}>
                    <input
                      type="text"
                      value={spellingInput}
                      onChange={(e) => setSpellingInput(e.target.value)}
                      placeholder="輸入英文單字拼法..."
                      style={styles.spellingInput}
                      disabled={!!spellingResult}
                    />
                    {!spellingResult && (
                      <button type="submit" style={{ ...styles.searchBtn, width: '100%', marginTop: '10px' }}>
                        送出答案
                      </button>
                    )}
                  </form>

                  {spellingResult === 'correct' && (
                    <div style={{ color: '#15803d', fontWeight: '700', fontSize: '18px', marginTop: '12px' }}>
                      🎉 完全正確！答案就是 {currentQuestion.word}
                    </div>
                  )}
                  {spellingResult === 'wrong' && (
                    <div style={{ color: '#b91c1c', fontWeight: '700', fontSize: '18px', marginTop: '12px' }}>
                      ❌ 拼錯囉！正確拼法是：<span style={{ textDecoration: 'underline' }}>{currentQuestion.word}</span>
                    </div>
                  )}
                </>
              )}

              {(selectedOption || spellingResult) && (
                <div style={{ marginTop: '24px' }}>
                  <button onClick={() => generateQuestion()} style={styles.nextBtn}>
                    下一題 ➔
                  </button>
                </div>
              )}
            </div>
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
    maxWidth: '820px',
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
  zhBadge: {
    marginTop: '8px',
    display: 'inline-block',
    backgroundColor: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
    padding: '4px 12px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '700',
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
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  starterBtn: {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  toolBtn: {
    backgroundColor: '#ffffff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
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
  quizTopBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  modeSwitch: {
    display: 'flex',
    gap: '8px',
  },
  modeBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '14px',
    cursor: 'pointer',
  },
  modeBtnActive: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #0f172a',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  scoreBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '14px',
  },
  quizCard: {
    backgroundColor: '#ffffff',
    padding: '32px 24px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    maxWidth: '540px',
    margin: '0 auto',
    textAlign: 'left',
  },
  optionBtn: {
    padding: '14px 18px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  optionCorrect: {
    padding: '14px 18px',
    borderRadius: '12px',
    border: '2px solid #16a34a',
    backgroundColor: '#dcfce7',
    color: '#14532d',
    cursor: 'default',
  },
  optionWrong: {
    padding: '14px 18px',
    borderRadius: '12px',
    border: '2px solid #dc2626',
    backgroundColor: '#fee2e2',
    color: '#7f1d1d',
    cursor: 'default',
  },
  spellingInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 16px',
    fontSize: '18px',
    textAlign: 'center',
    borderRadius: '10px',
    border: '2px solid #cbd5e1',
    outline: 'none',
  },
  nextBtn: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 28px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
