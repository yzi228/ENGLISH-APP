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
              <button onClick={
