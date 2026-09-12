// ===================================================
// 우리 반 담벼락
//
// 메모를 쓰면 Firebase Firestore에 저장됩니다.
// 새로고침해도 메모가 사라지지 않고,
// 다른 사람이 쓴 메모도 실시간으로 나타납니다.
// 구글 계정으로 로그인해야 메모를 쓸 수 있습니다.
// ===================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCpHLVwcRs5MWbdgJehBKactd4kEIOJJoY",
  authDomain: "fir-starter-982c1.firebaseapp.com",
  projectId: "fir-starter-982c1",
  storageBucket: "fir-starter-982c1.firebasestorage.app",
  messagingSenderId: "481573475863",
  appId: "1:481573475863:web:ce6cd75d62ebd494beae52"
};

// Firebase와 Firestore, Auth를 초기화합니다.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Firestore 안의 "memos" 켜렉션을 가리킵니다.
const memosCol = collection(db, "memos");

// 현재 로그인한 사용자의 역할입니다. ('teacher' | 'student' | null)
// 역할이 바뀌면 담벼락을 다시 그리기 위해 모듈 수준에 둥니다.
let currentRole = null;

// 가장 최근 메모 목록입니다.
// 역할이 능동적으로 바뀌어도 다시 그릴 수 있도록 보관합니다.
let latestMemos = [];




// ===================================================
// 데이터를 다루는 함수 세 개
// ===================================================

// 메모를 읽어 옵니다.
// onSnapshot이 넘겨준 snapshot에서 문서 목록을 꺼냅니다.
// id는 Firestore가 자동으로 붙여 주는 문서 ID 문자열입니다.
function loadMemos(snapshot) {
  return snapshot.docs.map(function (docSnap) {
    return Object.assign({ id: docSnap.id }, docSnap.data());
  });
}

// 메모를 새로 씁니다.
// uid도 함께 저장합니다. (나중에 "내 메모만 삭제" 기능을 붙일 때 씁니다.)
async function addMemo(text) {
  const user = auth.currentUser;
  // 로그인하지 않은 상태면 저장하지 않습니다.
  if (!user) return;

  await addDoc(memosCol, {
    text: text,
    createdAt: Date.now(),
    uid: user.uid
  });
}

// 메모를 지웁니다.
// 교사만 지울 수 있습니다.
async function deleteMemo(id) {
  if (currentRole !== "teacher") return;
  try {
    await deleteDoc(doc(db, "memos", id));
  } catch (e) {
    alert("삭제에 실패했습니다. Firestore 보안 규칙을 확인해 주세요.\n" + e.message);
  }
}

// AI 코멘트를 요청하고 Firestore에 저장합니다.
// 교사만 호출할 수 있습니다.
// 개인정보 보호: 메모 콘텐츠(text)만 보냔고 uid·이메일은 보내지 않습니다.
async function aiComment(memoId, text) {
  if (currentRole !== "teacher") return;

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });
    const data = await res.json();
    if (!data.comment) throw new Error("코멘트 없음");

    // Firestore 메모 문서에 comment 필드를 추가합니다.
    // onSnapshot이 감지해서 자동으로 render()를 부릅니다.
    await updateDoc(doc(db, "memos", memoId), { comment: data.comment });
  } catch (e) {
    alert("AI 코멘트 생성에 실패했습니다.\n" + (e.message ?? ""));
  }
}


// ===================================================
// 화면 그리기
// ===================================================

// memos: loadMemos()가 반환한 배열을 받아서 담벼락을 다시 그립니다.
function render(memos) {
  const wall = document.getElementById("wall");
  wall.innerHTML = "";

  memos.forEach(function (memo) {
    wall.appendChild(makeMemo(memo));
  });
}

// 메모 한 장 만들기
function makeMemo(memo) {
  const div = document.createElement("div");
  div.className = "memo";

  // 교사만 삭제 버튼과 AI 코멘트 버튼을 복 수 있습니다.
  if (currentRole === "teacher") {
    const del = document.createElement("button");
    del.textContent = "×";
    del.addEventListener("click", function () {
      deleteMemo(memo.id);
    });
    div.appendChild(del);

    const aibtn = document.createElement("button");
    aibtn.textContent = "💬 AI";
    aibtn.title = "Gemini AI 코멘트 달기";
    aibtn.style.marginRight = "4px";
    aibtn.addEventListener("click", function () {
      // 클릭 중 중복 요청 방지
      aibtn.disabled = true;
      aibtn.textContent = "⏳ ...";
      aiComment(memo.id, memo.text).finally(function () {
        aibtn.disabled = false;
        aibtn.textContent = "💬 AI";
      });
    });
    div.appendChild(aibtn);
  }

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  // AI 코멘트가 있으면 메모 아래에 표시합니다.
  if (memo.comment) {
    const commentDiv = document.createElement("div");
    commentDiv.className = "ai-comment";
    commentDiv.textContent = "🤖 " + memo.comment;
    div.appendChild(commentDiv);
  }

  return div;
}


// ===================================================
// 실시간 리스너
// Firestore 데이터가 바뀔 때마다 자동으로 render()를 부릅니다.
// ===================================================

// createdAt 순서로 정렬해서 가져옵니다.
const q = query(memosCol, orderBy("createdAt"));

onSnapshot(q, function (snapshot) {
  latestMemos = loadMemos(snapshot);
  render(latestMemos);
});


// ===================================================
// 메모 쓰는 칸 — 요소 참조
// onAuthStateChanged 안에서도 쓰이므로 먼저 선언합니다.
// ===================================================

const input = document.getElementById("input");


// ===================================================
// 로그인 / 로그아웃
// ===================================================

// 구글 로그인 팝업을 엽니다.
function signIn() {
  signInWithPopup(auth, provider);
}

// 로그아웃합니다.
function signOutUser() {
  signOut(auth);
}

// 로그인 상태가 바뀔 때마다 userArea와 입력칸을 업데이트합니다.
onAuthStateChanged(auth, async function (user) {
  const userArea = document.getElementById("userArea");
  userArea.innerHTML = "";

  if (user) {
    // roles 컬렉션에서 역할을 읽어 옵니다.
    // 읽기 권한이 없거나 문서가 없으면 기본값 'student'로 처리합니다.
    try {
      const roleSnap = await getDoc(doc(db, "roles", user.uid));
      currentRole = roleSnap.exists() ? roleSnap.data().role : "student";
    } catch (e) {
      // 보안 규칙에서 roles 읽기가 막힌 경우 student로 처리합니다.
      currentRole = "student";
    }

    // 로그인 상태: 이름과 역할, 로그아웃 버튼을 보여 줍니다.
    const roleLabel = currentRole === "teacher" ? "선생님" : "학생";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = "[" + roleLabel + "] " + user.displayName + "님 안녕하세요!  ";

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "로그아웃";
    logoutBtn.addEventListener("click", signOutUser);

    userArea.appendChild(nameSpan);
    userArea.appendChild(logoutBtn);

    // 로그인했으므로 입력칸을 활성화합니다.
    input.disabled = false;
    input.placeholder = "메모를 쓰고 엔터";
    input.focus();
  } else {
    currentRole = null;

    // 로그아웃 상태: 로그인 버튼을 보여 줍니다.
    const loginBtn = document.createElement("button");
    loginBtn.textContent = "구글로 로그인";
    loginBtn.addEventListener("click", signIn);
    userArea.appendChild(loginBtn);

    // 로그아웃 상태에서는 입력칸을 비활성화합니다.
    input.disabled = true;
    input.placeholder = "로그인해야 메모를 쓸 수 있습니다";
  }

  // 역할이 바뀌어도 담벼락을 다시 그립니다.
  render(latestMemos);
});


// ===================================================
// 메모 쓰는 칸 — 키보드 이벤트
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

// onkeydown 대신 addEventListener를 씁니다.
input.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const text = input.value.trim();
    if (text === "") return;

    // 5글자 미만이면 저장하지 않습니다.
    if (text.length < 5) return;

    addMemo(text);
    input.value = "";
    // render()는 onSnapshot이 자동으로 부릅니다.
  }
});
