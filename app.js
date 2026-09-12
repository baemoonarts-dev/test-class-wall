// ===================================================
// 우리 반 담벼락
//
// 메모를 쓰면 Firebase Firestore에 저장됩니다.
// 새로고침해도 메모가 사라지지 않고,
// 다른 사람이 쓴 메모도 실시간으로 나타납니다.
// ===================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCpHLVwcRs5MWbdgJehBKactd4kEIOJJoY",
  authDomain: "fir-starter-982c1.firebaseapp.com",
  projectId: "fir-starter-982c1",
  storageBucket: "fir-starter-982c1.firebasestorage.app",
  messagingSenderId: "481573475863",
  appId: "1:481573475863:web:ce6cd75d62ebd494beae52"
};

// Firebase와 Firestore를 초기화합니다.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore 안의 "memos" 컬렉션을 가리킵니다.
const memosCol = collection(db, "memos");




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
// 백엔드 2: 여기에 "누가 썼는지"(uid)를 함께 저장하게 됩니다.
async function addMemo(text) {
  await addDoc(memosCol, {
    text: text,
    createdAt: Date.now()
  });
}

// 메모를 지웁니다.
// 백엔드 2: 지금은 누구든 남의 메모를 지울 수 있습니다. 이걸 막는 것이 과제입니다.
async function deleteMemo(id) {
  await deleteDoc(doc(db, "memos", id));
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

  const del = document.createElement("button");
  del.textContent = "×";
  // onclick 대신 addEventListener를 씁니다.
  // deleteMemo가 Firestore를 바꾸면 onSnapshot이 자동으로 render()를 부릅니다.
  del.addEventListener("click", function () {
    deleteMemo(memo.id);
  });
  div.appendChild(del);

  const span = document.createElement("span");
  span.textContent = memo.text;
  div.appendChild(span);

  return div;
}


// ===================================================
// 실시간 리스너
// Firestore 데이터가 바뀔 때마다 자동으로 render()를 부릅니다.
// ===================================================

// createdAt 순서로 정렬해서 가져옵니다.
const q = query(memosCol, orderBy("createdAt"));

onSnapshot(q, function (snapshot) {
  const memos = loadMemos(snapshot);
  render(memos);
});


// ===================================================
// 메모 쓰는 칸
// 엔터를 누르면 담벼락에 붙습니다 (줄바꿈은 Shift + 엔터)
// ===================================================

const input = document.getElementById("input");

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

input.focus();
