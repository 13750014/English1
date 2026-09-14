const SUPABASE_URL = 'https://eaysbzduforbmbucicpg.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVheXNiemR1Zm9yYm1idWNpY3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNDYzMjUsImV4cCI6MjEwNDkyMjMyNX0.v0xV7fjkxtN5sXtTSWjS-g0WHJ3mf43FV5c1XurUCUs'; 

if (!window.supabase) {
    alert("SDK 載入失敗，請檢查 HTML 是否正確引入 supabase.js");
}
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let questionsList = [];
let currentIndex = 0;
let canAnswer = true;
let userAnswers = {}; // 紀錄每一題的作答結果 (對/錯)

const questionText = document.getElementById('question-text');
const feedbackBox = document.getElementById('feedback-box');
const rowContainer = document.getElementById('options-row') || document.getElementById('options-container'); 
const questionNumBadge = document.getElementById('question-num-badge') || document.getElementById('question-index'); 
const categoryBadge = document.getElementById('category-badge');
const answerTracker = document.getElementById('answer-tracker');

// 網頁載入後自動撈題目
document.addEventListener('DOMContentLoaded', async () => {
    await fetchQuestions();
});

// 🟢 取得已做過題目的 ID 陣列
function getAnsweredQuestionIds() {
    const answered = localStorage.getItem('answeredQuestions');
    return answered ? JSON.parse(answered) : [];
}

// 🟢 記錄已做過題目的 ID
function saveAnsweredQuestionId(id) {
    const answered = getAnsweredQuestionIds();
    if (!answered.includes(id)) {
        answered.push(id);
        localStorage.setItem('answeredQuestions', JSON.stringify(answered));
    }
}

async function fetchQuestions() {
    try {
        const answeredIds = getAnsweredQuestionIds();
        let query = supabaseClient.from('questions').select('*');

        // 1. 過濾掉已做過的題目
        if (answeredIds.length > 0) {
            query = query.not('id', 'in', `(${answeredIds.join(',')})`);
        }

        // 2. 限制抓取最多 10 筆資料
        query = query.limit(10);

        const { data, error } = await query;

        if (error) {
            alert("連線失敗: " + error.message);
            return;
        }

        if (data && data.length > 0) {
            // 洗牌演算法（隨機打亂）
            questionsList = data.sort(() => Math.random() - 0.5);
            currentIndex = 0;
            userAnswers = {}; // 重置作答紀錄
            
            // 初始化右側紀錄面板
            renderTracker();
            
            showQuestion(currentIndex); 
        } else {
            // 刷完題目時的處置
            if (questionText) questionText.innerText = '🎉 太棒了！你已經刷完所有的題目了！';
            if (rowContainer) rowContainer.innerHTML = '';
            if (answerTracker) answerTracker.innerHTML = '<span class="text-muted small">無剩餘題目</span>';
            
            const resetBtn = document.createElement('button');
            resetBtn.className = 'btn btn-outline-danger mt-3';
            resetBtn.innerText = '🔄 清除答題紀錄並重新刷題';
            resetBtn.onclick = () => {
                localStorage.removeItem('answeredQuestions');
                location.reload();
            };
            if (rowContainer) rowContainer.appendChild(resetBtn);
        }
    } catch (err) {
        console.error(err);
    }
}

// 🟢 初始化右側面板號碼
function renderTracker() {
    if (!answerTracker) return;
    answerTracker.innerHTML = '';

    questionsList.forEach((q, idx) => {
        const badge = document.createElement('span');
        badge.id = `track-item-${idx}`;
        badge.className = 'badge status-unanswered p-2 fs-6 record-badge';
        badge.style.cursor = 'pointer';
        badge.innerText = idx + 1;
        
        // 點擊右側號碼直接切換至該題
        badge.onclick = () => {
            currentIndex = idx;
            showQuestion(currentIndex);
        };

        answerTracker.appendChild(badge);
    });
}

function showQuestion(index) {
    if (index >= questionsList.length) {
        questionText.innerText = '🎉 恭喜你完成了本次所有未做過的題目！';
        rowContainer.innerHTML = '';
        feedbackBox.className = 'alert mt-4 alert-success';
        feedbackBox.innerText = '太厲害了！重整網頁可以再次檢查是否有新題目。';
        feedbackBox.classList.remove('d-none');
        return;
    }

    const currentQ = questionsList[index];

    // 更新分類與題號
    if (categoryBadge && currentQ.category) {
        const catStr = Array.isArray(currentQ.category) ? currentQ.category.join(' / ') : currentQ.category;
        categoryBadge.innerText = catStr || '教育通用';
    }

    if (questionNumBadge) {
        questionNumBadge.innerText = `題號: ${index + 1} / ${questionsList.length}`;
    }

    // 顯示題目內容
    const qContent = currentQ.description || currentQ.title || '（此題無敘述）';
    questionText.innerText = `題目：${qContent}`;

    feedbackBox.classList.add('d-none');
    rowContainer.innerHTML = ''; 

    // 解析 options 欄位
    let optionsObj = {};
    if (currentQ.options) {
        if (typeof currentQ.options === 'string') {
            try {
                optionsObj = JSON.parse(currentQ.options);
            } catch (e) {
                console.error('選項 JSON 解析失敗:', e);
            }
        } else {
            optionsObj = currentQ.options;
        }
    }

    // 檢查這一題是否已經做過
    const hasAnswered = userAnswers.hasOwnProperty(index);
    canAnswer = !hasAnswered;

    // 生成選項按鈕
    if (optionsObj && typeof optionsObj === 'object' && !Array.isArray(optionsObj)) {
        Object.keys(optionsObj).forEach((key) => {
            const optionText = optionsObj[key];
            const colDiv = document.createElement('div');
            colDiv.className = 'col-12 col-md-6';
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-primary w-100 text-start py-3 option-btn';
            btn.innerText = `${key}. ${optionText}`;
            if (hasAnswered) btn.disabled = true;
            
            btn.addEventListener('click', () => checkAnswer(key, optionText, btn, optionsObj));
            colDiv.appendChild(btn);
            rowContainer.appendChild(colDiv);
        });
    } else if (Array.isArray(optionsObj)) {
        optionsObj.forEach((optionText) => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-12 col-md-6';
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-primary w-100 text-start py-3 option-btn';
            btn.innerText = optionText;
            if (hasAnswered) btn.disabled = true;
            
            btn.addEventListener('click', () => checkAnswer(optionText, optionText, btn, optionsObj));
            colDiv.appendChild(btn);
            rowContainer.appendChild(colDiv);
        });
    }

    // 控制按鈕（上一題 / 下一題）
    const navDiv = document.createElement('div');
    navDiv.className = 'd-flex justify-content-between mt-4 w-100';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary px-4 py-2';
    prevBtn.innerText = '⬅️ 上一題';
    prevBtn.disabled = (index === 0);
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            showQuestion(currentIndex);
        }
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary px-4 py-2';
    nextBtn.innerText = (index === questionsList.length - 1) ? '完成 🏁' : '下一題 ➡️';
    nextBtn.addEventListener('click', () => {
        if (currentIndex < questionsList.length - 1) {
            currentIndex++;
            showQuestion(currentIndex);
        }
    });

    navDiv.appendChild(prevBtn);
    navDiv.appendChild(nextBtn);
    rowContainer.appendChild(navDiv);
}

// 檢查答案邏輯
function checkAnswer(selectedKey, selectedText, clickedBtn, optionsObj) {
    if (!canAnswer) return; 
    canAnswer = false;

    const currentQ = questionsList[currentIndex];

    // 作答後立即將此題 ID 紀錄為「已做過」
    saveAnsweredQuestionId(currentQ.id);

    const correctAnswers = (currentQ.correct_answer || '').split(',').map(s => s.trim());
    const isCorrect = correctAnswers.includes(selectedKey.trim()) || correctAnswers.includes(selectedText.trim());

    // 紀錄作答狀態
    userAnswers[currentIndex] = isCorrect;

    // 🟢 同步更新右側紀錄欄位顏色 (對: 紅色, 錯: 綠色)
    updateTracker(currentIndex, isCorrect);

    feedbackBox.classList.remove('d-none');
    document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);

    let displayCorrectAns = currentQ.correct_answer;
    if (typeof optionsObj === 'object' && optionsObj[currentQ.correct_answer]) {
        displayCorrectAns = `${currentQ.correct_answer}. ${optionsObj[currentQ.correct_answer]}`;
    }

    if (isCorrect) {
        clickedBtn.className = 'btn btn-danger w-100 text-start py-3 text-white option-btn'; // 紅色表示正確
        feedbackBox.className = 'alert mt-4 alert-danger';
        feedbackBox.innerHTML = `<strong>🎉 正解！</strong><br>${currentQ.explanation || '本題無解析。'}`;
    } else {
        clickedBtn.className = 'btn btn-success w-100 text-start py-3 text-white option-btn'; // 綠色表示錯誤
        feedbackBox.className = 'alert mt-4 alert-success';
        feedbackBox.innerHTML = `<strong>❌ 答錯了！</strong><br>正確答案是：<strong>${displayCorrectAns}</strong><br><br><strong>解析：</strong><br>${currentQ.explanation || '本題無解析。'}`;
    }
}

// 🟢 更新右側面板顏色的函式 (對=紅色, 錯=綠色)
function updateTracker(questionIndex, isCorrect) {
    const trackerItem = document.getElementById(`track-item-${questionIndex}`);
    if (trackerItem) {
        trackerItem.classList.remove('status-unanswered');
        if (isCorrect) {
            trackerItem.classList.add('status-correct'); // 紅色
        } else {
            trackerItem.classList.add('status-wrong');   // 綠色
        }
    }
}